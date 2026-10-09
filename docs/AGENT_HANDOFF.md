> **AI AGENT INSTRUCTION:** Read this document before exploring the repository. Treat it as the canonical engineering state snapshot. Inspect only files relevant to the current task and update this document whenever implementation state changes.

# Agent Handoff — Pratha

| Field | Value |
|---|---|
| Last updated | 2026-09-26 |
| Branch | `devin/1790111517-pratha-supabase-platform` (PR #1, open) |
| Current phase | Hosted Supabase integration complete for catalog/Auth/booking/contribution; `rishi-ask` Edge Function live; external-credential work remains |
| Overall status | **Not production-ready.** Web, Android and Expo builds pass; hosted RLS/RPC flows verified end-to-end; AI works via deployed Edge Function with Cloudflare Worker fallback. Payments, notification provider, custom SMTP and Auth dashboard settings are blocked on credentials/approvals |

## Product and architecture

Pratha (formerly Sattva) is a cultural, temple, Pooja, Gaushala, Seva, and spiritual-assistance platform. The web app is React 19 + Vite + React Router + TanStack Query + Tailwind + Radix + Lucide. Android wraps `web/dist` with Capacitor. iOS uses the existing Expo SDK 57 DOM bridge in `expo/src/PrathaDomBridge.tsx`; do not rewrite the web UI into React Native primitives.

```text
React DOM web / Capacitor Android / Expo DOM iOS
                         ↓
Supabase Auth + PostgreSQL/RLS + RPCs (+ Edge Functions: not deployed)
                         ↓
Razorpay, Gemini, notifications (not configured)
```

The Cloudflare Worker and Firebase client remain only as fallback paths (Rishi AI still calls the Worker, request `{query}` → response `{response}`, with a local fallback answer). All catalog, profile, family, Auth, booking and contribution code uses `web/src/lib/supabase.ts` and `web/src/lib/api/*.ts`.

Expo bridge note: `expo/src/PrathaDomBridge.tsx` imports `QueryClientProvider`/`queryClient` re-exported from `web/src/App.tsx` so Metro uses one TanStack Query copy (two copies split the provider context). `expo/env.d.ts` types `import.meta.env` for the shared Supabase client.

## Hosted Supabase state

- Project `Pratha`, ref `yxwwgynxgihrktwndhep`, region `ap-south-1`, URL `https://yxwwgynxgihrktwndhep.supabase.co`
- Supabase MCP (`supabase-mcp-server`) has write access: `apply_migration`, `execute_sql`, `get_logs`, `get_advisors` were used. No local Supabase CLI.
- Browser key: publishable key fallback in `web/src/lib/supabase.ts`; deployments should set `VITE_SUPABASE_PUBLISHABLE_KEY`. `web/.env` does not exist locally.

Applied migrations (all hosted):

1. `001_sattva_schema` … 6. `006_demonstration_catalog`
7. `20260925000100_007_security_hardening.sql`
8. `20260926000100_008_restore_policy_helper_grants.sql` — 007 revoked EXECUTE on the six RLS helper functions from `anon`/`authenticated`, which broke every public SELECT (`42501 permission denied for function manages_temple`). Policy expressions run as the caller, so these helpers must stay executable. 008 restores that (matching 005).
9. `20260926000200_009_live_darshan_seed.sql` — `live_streams` demo rows using `website` provider to official portals (no stable official 24/7 stream exists; YouTube embeds supported by the UI).
10. `20260926000300_010_booking_status_enum_cast.sql` — `create_puja_booking` cast of CASE result to `booking_status`.
11. `20260926000400_011_booking_rpc_searchpath.sql` — restores `search_path = public, extensions` and generates refs from `gen_random_uuid()` (010 had dropped pgcrypto from the path → `gen_random_bytes does not exist`).
12. `20260926000500_012_indexes_and_extension_schema.sql` — 39 covering indexes on unindexed FKs + `pg_trgm` moved to `extensions` schema (advisor findings).
13. `20260926000600_013_edge_secret_accessor.sql` — `supabase_vault` extension + `public.get_edge_secret(text)` SECURITY DEFINER accessor granted to `service_role` only. The `gemini_api_key` vault secret was created via MCP (values never live in migration files).
14. `20261001000100_014_profile_birth_details.sql` — dob/tob/pob/lat/lon columns + UPDATE grants.
15. `20261002000100_015_demo_catalog_seed.sql` — 7 temples, 15 puja offerings, 4 festivals, 7 events, 4 live portals, 6 animals, 4 seva campaigns.
16. `20261003000100_016_referrals.sql` — `profiles.referral_code`, `public.referrals` ledger, `ensure_referral_code`/`record_referral` RPCs (authenticated-only). Applied via MCP `execute_sql`.
17. `20261003000200_017_notifications.sql` — `pg_net`, `notification_log`, `referrals_notify_credit` trigger → `notify-send` edge fn. Vault: `resend_api_key`, `notify_hook_secret`, `notify_function_url`, `supabase_publishable_key`.

Security model (verified via MCP): RLS enabled on all public tables; six policy helpers executable by anon/authenticated (intended); booking/contribution RPCs authenticated-only; payment/notification functions service-role-only; `profiles` has own-row SELECT/UPDATE only (rows created by `handle_new_user` trigger, so the client uses UPDATE, never UPSERT); bookings/contributions writable only through RPCs.

Advisor findings (2026-09-26, security): `anon/authenticated_security_definer_function_executable` for the six policy helpers — intentional, documented above; they only inspect `auth.uid()` roles. `complete_booking`, `generate_vaccine_alerts`, `recompute_trust_score` were audited and already contain internal role checks (`manages_temple`, `manages_gaushala`, `is_gaushala_admin`). `pg_trgm` moved out of `public` (012); all unindexed FKs covered (012). Remaining: leaked-password protection disabled (dashboard toggle, needs user).

Edge Function `rishi-ask` (deployed, `verify_jwt` + in-function `auth.getUser()` check; anon key alone rejected): Gemini key resolves from `GEMINI_API_KEY` function secret, else the `gemini_api_key` vault secret via `get_edge_secret`. `AI_MODEL` env overrides `gemini-2.5-flash`. Source: `supabase/functions/rishi-ask/index.ts`; client: `web/src/lib/api/ai.ts` falls back to the Worker on function failure.

The Cloudflare Worker `utsavam-backend` is deployed under a different Cloudflare account (`utsavam-api` workers.dev subdomain) than the one this environment's Cloudflare MCP can see — redeploying it to add JWT verification to `/api/v1/ai/ask` needs wrangler login for that account. Its unauthenticated AI route remains as fallback; treat as quota-exposure debt.

## Current implementation status

| Area | Status | Notes |
|---|---|---|
| Public Home | Working | Hosted Pooja + `welfare_stats` (`animals_cared`, `gaushalas`, `temples`); no fabricated meal stat |
| Discover + detail routes | Working | `/discover`, `/temples/:slug`, `/events/:slug`, `/festivals/:slug`, `/darshan`, `/darshan/:id` via `web/src/lib/api/discover.ts`. Event selects must use `categories!events_category_id_fkey(name)` (events has two FKs to categories → PostgREST 300 otherwise) |
| Pooja booking | Working | Date picker honors `lead_time_days`/`available_days`; sankalpa/nakshatra validation; real RPC errors shown; free → confirmed, paid → pending_payment; no fabricated references |
| Gaushala / passports | Working | Animals + `breeds(name)` + Gaushala embeds; chips filter client-side |
| Seva contributions | Working (unpaid) | Real published campaigns; `create_contribution` RPC; rows stay `created` until a payment flow exists |
| Profile/family | Working | Profile UPDATE and family insert verified via hosted E2E |
| Supabase Auth | Working | Email/password verified; forgot-password + recovery in `Auth.tsx`; Resend SMTP configured by user in dashboard; Google OAuth wired (button + `pratha://auth/callback` deep link) — needs redirect allow-list entry and a real-device test |
| Firebase/Worker retirement | Partial | Rishi primary = `rishi-ask` Edge Function (verified 200 with user JWT); Worker kept as unauthenticated fallback |
| Payments | Blocked | Needs Razorpay sandbox keys + webhook Edge Function + sandbox validation |
| AI Edge Function | Working | `rishi-ask` deployed and verified; Gemini key in vault; signed-in-only |
| Notification Edge Function | Blocked | Needs notification provider credentials |
| Expo | Passing | `tsc --noEmit` clean; `expo export --platform web` succeeds |
| Android | Passing | `npx cap sync android` + `./gradlew assembleDebug` pass (set `ANDROID_HOME=~/Android/Sdk`) |

PostgREST reminder: to-one embeds return objects, not arrays (`row.temples?.name`, never `row.temples?.[0]`).

## Important files

- `web/src/App.tsx` — routes, QueryClient, AuthProvider; re-exports query provider for Expo.
- `web/src/features/auth/Auth.tsx` / `AuthContext.tsx` — Supabase Auth, forgot password, recovery.
- `web/src/features/discover/*` — Discover, TempleDetail, EventDetail, FestivalDetail, LiveDarshan.
- `web/src/features/pujas/PujaDetailModal.tsx` — booking UX (keep all hooks above the early return).
- `web/src/features/seva/DonationModal.tsx`, `web/src/features/gaushala/SponsorModal.tsx` — contributions.
- `web/src/lib/api/{puja,gaushala,profile,discover,errors,ai,client}.ts` — data layer; `errors.ts` maps RPC error codes to user messages.
- `web/scripts/e2e-hosted.mjs` — hosted Supabase E2E (auth, RLS, RPCs).
- `supabase/migrations/` — schema history through 011.
- `expo/src/PrathaDomBridge.tsx`, `expo/env.d.ts` — preserve.
- `web/android/` — generated Capacitor output; do not edit manually.

## Validation performed (2026-09-26)

- `web`: `npx tsc -b`, `npm run lint` (0 errors, 9 warnings), `npm run build` pass.
- `expo`: `tsc --noEmit` clean; `npx expo export --platform web` succeeds.
- Android: debug APK `web/android/app/build/outputs/apk/debug/app-debug.apk` builds.
- Hosted E2E (`node web/scripts/e2e-hosted.mjs`): 19/19 passed — confirmed sign-in, anon reads, anon RPC rejection, profile update, cross-user insert rejection, family insert, booking validation errors, free/paid bookings, owner RLS reads, direct-insert rejection, contribution, cancellation.
- Browser QA (Python Playwright + system Chromium; the Playwright MCP needs `/opt/google/chrome/chrome`, which is not installed): 20 desktop (1440×900) + mobile (390×844) route checks with no console errors and no HTTP 300/4xx/5xx. Signed-in UI booking `PRT-192CBE75` and ₹10 contribution `4e025aae-…` verified in hosted rows via MCP (booking `confirmed` for 2026-09-27; contribution `created`, 1000 paise, campaign `50000000-…-0001`). Signed-out booking/donation redirect to `/login`.
- QA round 1 bugs fixed: booking modal Rules-of-Hooks crash, event 300 ambiguous embed, Gaushala `gaushala_id=eq.All` 400, wrong `welfare_stats` fields, array-shaped embeds.
- Migrations 012/013 applied via MCP: 39 FK indexes created (140 public indexes total), `pg_trgm` in `extensions`, `get_edge_secret` granted to service_role only (anon rejected with 42501).
- `rishi-ask` Edge Function v3 live: no auth header → 401, publishable-key-only → 401, signed-in user → 200 with a real Gemini `gemini-2.5-flash` response.
- **Android emulator E2E (Pixel_9 AVD)**: debug APK installs, launches, safe-area insets correct (see below), `/profile` redirects signed-out users to `/login`, email/password sign-in against hosted Supabase succeeds and the session persists across app reinstalls. Demo account `pratha.demo.client@gmail.com` (server-confirmed email) is the client-testing credential.
- Emulator caveat: the WebView renderer occasionally crashes on cold boot under the software GPU (`swiftshader`), freezing the app on "Restoring Sacred Session". Force-stop + relaunch recovers. Verify on hardware before assuming an app bug.

## Janma recommendations (migration 014, fn `kundali-ask`)

- `profiles` gained `birth_date/birth_time/birth_place/birth_lat/birth_lon`. NOTE: `profiles` uses **column-scoped UPDATE grants** — new columns need `GRANT UPDATE (...) TO authenticated` or client saves fail with 42501.
- `kundali-ask` edge fn (JWT-gated): Schlyter low-precision ephemeris → sidereal via Lahiri ayanamsa → nakshatra/pada, moon+sun rashi, tithi, lagna. Lagna = ecliptic horizon-scan (alt zero-crossing with sin(hourAngle)<0 — closed-form atan2 versions return the descendant ~180° off). POB resolves via offline CITY_COORDS table first, Nominatim fallback; tz auto-derived (IST inside India bbox). Gemini narration needs `thinkingConfig:{thinkingBudget:0}` — gemini-2.5 burns output tokens on thinking and truncates otherwise.
- UI: Profile → Settings → "Janma Details" form; `/pujas` shows "For Your Janma" card (or a CTA to add birth details).
- `BirthDetailsPrompt` (mounted under ProtectedRoute in App.tsx): post-login modal capturing name + DOB/TOB/POB when profile lacks birth details; "Maybe later" snoozes 7 days via `pratha-janma-dismissed` timestamp in localStorage (legacy `'1'` flag counts as expired → prior dismissers get re-prompted once).
- `ProfileNudge` on Home: completeness bar (8 fields: name/photo/phone/city/gotra/birth date/time/place) linking to /profile; hides when full.
- Edit Profile (Profile → Settings): avatar upload to `avatars` bucket at `{uid}/avatar-<ts>.<ext>` (storage policies already scope writes to own folder; bucket is public-read → render via `avatarPublicUrl(avatarPath)`), plus display_name/phone/city/gotra. Avatar shows in mobile header dot, sidebar account card, profile header; displayName drives Home greeting + AppShell name.
- Native Google sign-in (Android): `web/src/lib/auth/oauth.ts` uses `@capgo/capacitor-social-login` — native Credential Manager bottom-sheet → `idToken` → `supabase.auth.signInWithIdToken`. Requires `VITE_GOOGLE_WEB_CLIENT_ID` (the OAuth **Web** client ID from Supabase → Auth → Providers → Google) at build time, **and** an Android-type OAuth client in the same GCP project (package `com.utsavam.sattva`, debug SHA-1 `7D:1B:5D:36:B0:4C:B5:E6:10:10:C2:7E:43:EC:8C:27:05:98:66:22`; add the release-keystore SHA-1 for signed builds). Falls back to the browser OAuth + `pratha://auth/callback` deep-link flow when unconfigured or the user cancels. **Gotcha:** never pass `options.scopes` to `SocialLogin.login` — it requires a `ModifiedMainActivityForSocialLoginPlugin` class in MainActivity and rejects at runtime (silent browser fallback). ID token alone is sufficient. Verified on emulator: native Credential Manager 'Sign in with ease' sheet renders in-app. Google OAuth inside a WebView is blocked by Google — this plugin is the correct in-app path.
- Migration 015 seeds the demo catalog (deterministic 2*/3*/4*/5*/6*/7*/8*/9* uuids, `on conflict do nothing`): 4 temples + deity_i18n tags, 13 puja_offerings across all offering_kinds, 3 festivals, 4 events, 2 live_streams, 4 animals, 2 seva_campaigns, 2 welfare_updates. Generated columns: `name`/`title` derive from `*_i18n` — never insert them literally.
- Pujas filter chips: 'For You' (keyword-matches offerings vs nakshatra lord/deity map in PujaDiscovery), 'Nakshatra Pujas' (requires_nakshatra), 'Popular', per-kind ('Special'/'Archana'/'Abhishekam'/'Gau Seva'). `Puja.offeringKind` now mapped.
- QA note: `innerText` returns CSS-transformed text — check labels case-insensitively (`/for your janma/i`).
- Dark-theme glass: `--color-glass`/`--color-glass-border` tokens + `.glass-card` utility (translucent elevated surface + backdrop-blur); applied to shared `Card` + `.discover-card` + nudge. All `prefers-color-scheme: dark` CSS was converted to `html[data-theme='dark']` — the manual theme toggle ignores OS otherwise.
- Accuracy caveat: low-precision (~arc-minutes). For production-grade kundali, swap in a real astrology API (Vedic Rishi / Prokerala) — the chart shape is designed to be replaced server-side.

## Access model (updated 2026-10-01)

- Browsing is **public** again (client request — no login on entry). `/profile` alone is auth-gated; transactional RPCs remain server-side RLS-enforced.
- Login screen has **"Explore Demo Account"** — one-tap sign-in as `pratha.demo.client@gmail.com` (RLS-scoped; rotate after client testing). Hardcoded creds in `Auth.tsx` by design.
- Session identity: desktop sidebar card (name + "Signed in · email"), mobile header avatar + status dot; signed-out shows "Sign In" affordances.
- `vercel.json` ships CSP (script-src 'self' + sha256 of the `index.html` theme inline script — **regenerate the hash if that script changes**), frame-src limited to youtube.com embeds, nosniff, DENY framing, Permissions-Policy.

## Deployment (Vercel)

- **Live: `https://pratha-two.vercel.app`** — project `pratha` (team `marvelpokemaster-3377s-projects`), git-connected to `marvelpokemaster/Pratha`; pushes to `main` auto-deploy. Prod env vars set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `web/vercel.json` — Vite SPA config: `dist` output, catch-all rewrite to `index.html`, immutable asset caching. `.vercel/` is gitignored.
- PENDING (user): add `https://pratha-two.vercel.app/**` to Supabase Auth redirect URLs and set it as Site URL (or alongside the app scheme), or Google OAuth/reset links won't round-trip on the web.

## Known layout trap (fixed 2026-10-01)

- `index.css` had `* { margin: 0; padding: 0 }` as **unlayered** CSS, which beats all `@layer utilities` rules — silently killed every Tailwind margin utility (incl. `md:ml-64`, `mx-auto` centering). Removed; Tailwind preflight already resets. If spacing ever looks wrong on desktop, suspect cascade-layer issues first.
- Minimum text size is now 11px (`text-[10px]`→`text-[11px]` on nav labels, badges, chips).
- Main content is full-bleed (`p-4 md:p-8 xl:px-12 2xl:px-16`, no max-width cap) — sidebar `md:ml-64` relies on `main` having NO `w-full` (auto width fills minus margin). Fluid root font: `html { font-size: clamp(16px, 0.35vw+13.3px, 19px) }` scales all rem utilities with viewport.

## Android edge-to-edge & theme

- `@capawesome/capacitor-android-edge-to-edge-support` is required on Android 15+: Android WebView never populates `env(safe-area-inset-*)`; the plugin injects real insets so the existing `env()` CSS works. Without it the header renders under the status bar.
- Theme is `data-theme`-driven (`web/src/lib/theme.ts`), not `prefers-color-scheme` media queries: `localStorage["pratha-theme"]` = `light|dark|system`; `index.html` sets `data-theme` before first paint; dark tokens live under `:root[data-theme='dark']`; `@custom-variant dark` makes Tailwind `dark:` utilities follow the attribute. Settings tab → Appearance segmented control. `@capacitor/status-bar` syncs status-bar icon contrast.
- `/profile` is wrapped in `RequireAuth` (redirects to `/login` signed-out) — other routes stay public by design; booking/contribution modals gate per-action.
- `.action-tile` is shared by `<Link>` and `<button>` (Rishi tile); it needs `text-align: left`/`font: inherit` normalization or the button centers its text.

## Dharma Mitra Referral Program (added 2026-10-02)

- Frontend referral system (`web/src/lib/referral.ts`) generating deterministic devotee codes (`PRATHA-<NAME>-<HASH>`) and shareable links (`/?ref=<CODE>`).
- URL inbound capture: `captureInboundReferral()` runs in `App.tsx` on initial mount, storing the code in `localStorage['pratha_inbound_ref_code']`.
- Sign-up integration: `Auth.tsx` pre-fills the referral code field during registration and forwards it to `supabase.auth.signUp({ options: { data: { referred_by: code } } })`.
- Profile integration: `/profile` gained an **"Invite & Earn"** tab featuring one-click WhatsApp sharing with auspicious invite message, Web Share API (`navigator.share`), clipboard copy buttons with visual feedback, and 108 Punya points merit counter.
- Home screen prompt: A "Dharma Mitra Referral" banner on `/` directs devotees to `/profile?tab=referral`.
- Settings form layout fix (2026-10-02): Resolved overlapping inline `<label>` elements in `Profile.tsx` (Edit Profile & Janma Details) by migrating to responsive Tailwind CSS grid layouts (`grid-cols-1 sm:grid-cols-2` and `grid-cols-1 sm:grid-cols-3`) with dedicated `.form-group`, `.form-label`, and `.form-input` definitions in `Profile.css`.

## Server-side referral attribution + engagement emails (added 2026-10-03)

- **Migration 016 (`referrals`)**: `profiles.referral_code` (unique, backfilled `PRATHA-<NAME>-<ID4>`), `public.referrals` ledger (`unique(referred_user_id)` prevents double-credit, self-referral CHECK), RPCs `ensure_referral_code()` + `record_referral(text)` (SECURITY DEFINER, `authenticated`-only, anon revoked). Before this, `referred_by` only sat in `user_metadata` and the punya counter read a never-written localStorage key — rewards never accrued.
- **Migration 017 (`notifications`)**: `public.notification_log` (dedupe, `unique(user_id,type)`), `pg_net` extension, `referrals_notify_credit` AFTER-INSERT trigger → `net.http_post` to the `notify-send` edge fn. Trigger fn is revoked from all client roles. Vault secrets: `resend_api_key`, `notify_hook_secret`, `notify_function_url`, `supabase_publishable_key`.
- **`notify-send` edge function** (`supabase/functions/notify-send/`, `verify_jwt: false` — pg_net can't mint JWTs; every path guarded in-code): two caller modes — user JWT (self-only `welcome`, `janma_ready`) or `x-notify-secret` header (`referral_credited`). Sends via Resend API; HTML templates are terracotta-themed. Verified end-to-end via a real referral insert → 200 → email delivered.
- **Client wiring**: `referral.ts` gained `ensureReferralCode`, `recordStoredReferral`, `getReferralStatsServer`, `sendEngagementEmail`. `AuthContext` runs a once-per-session onboarding effect (ensure code → credit stored referral → welcome email). `Profile` uses the canonical DB code + server stats. `PujaDiscovery` fires `janma_ready` when the chart loads and links the janma card to the referral tab (trigger-moment share CTA).
- **Resend limit**: `onboarding@resend.dev` (test domain) only delivers to the Resend account owner's inbox. To email all users, verify a domain at resend.com/domains and update `FROM` in `notify-send/index.ts`.
- **FCM push (2026-10-03)**: Firebase project `sattva-utsavam-dev` (same GCP project as Google OAuth); Android app `1:1080658765469:android:8d5960177b71f50fdbd674` registered for `com.utsavam.sattva`; `google-services.json` in `web/android/app/` (gradle plugin already wired by Capacitor defaults). `@capacitor/push-notifications` installed; `POST_NOTIFICATIONS` in the manifest; `push_tokens` table (migration 018) stores device tokens via `registerPushToken()` in AuthContext. `notify-send` v4 sends FCM v1 pushes using the `fcm_service_account` vault secret — **secret not yet populated**: needs a service-account JSON (Firebase console → Project Settings → Service Accounts → Generate private key). Until then pushes silently skip; emails still send.

## Admin portal (added 2026-10-03)

- `/admin` ("Sanctum Control") — `web/src/features/admin/Admin.tsx` + `web/src/lib/api/admin.ts`. Gated client-side by `getMyAdminRoles()` (user_roles own-row SELECT) and server-side by existing RLS (`is_admin()`, `manages_temple()` already scope every admin-relevant table).
- The **Admin nav item only renders when `user_roles` is non-empty** for the signed-in user (`AppShell` query `['admin-roles']`, same key used by the page).
- Tabs: **Overview** (RLS-scoped counts), **Bookings** (list + `complete_booking`/`cancel_puja_booking` RPCs), **Devotees** (profiles), **Roles** (super_admin only — grant/revoke via direct `user_roles` writes allowed by `user_roles_admin` policy).
- Role enum: `super_admin`, `editor`, `temple_admin`, `gaushala_admin`, `gaushala_staff`, `vet`; scopes `global`/`temple`/`gaushala`. `marvelpokemaster@gmail.com` has `super_admin` global; the demo account has `editor` (kept for demoing the portal — revoke via Roles tab or SQL).
- Verified: non-admin sees no Admin item and `/admin` redirects `/`; editor sees portal minus Roles tab.

## Content CMS — Sanctum Control → Content (added 2026-10-03)

- WordPress-style CMS at `/admin` → Content. `web/src/features/cms/` + `web/src/lib/api/cms.ts`. Registry-driven: `entities.ts` declares each entity's fields/relations/defaults; `CmsPanel.tsx` renders section rail + list + editor drawer; `fields.tsx` is the input library (text/money/enum/date/datetime/relation/image/days-chips/json/uuid).
- 9 entities: Pujas, Cows, Temples, Events, Festivals, Darshan Streams, Seva Campaigns, Welfare Updates, Editorial. Draft → Publish workflow (status enum); Archive is a soft delete.
- List select columns are per-entity: `live_streams` has no `slug`; `welfare_updates` has no `created_at`/`updated_at` (orderCol → `published_at`). Column existence per table: SLUG_TABLES + `EntityConfig.orderCol`. (only SLUG_TABLES get `slug` — `animals`/`welfare_updates`/`editorial_blocks` lack the column; querying it breaks the whole list).
- **Edit loads the FULL row** (`getRow`) — the list row only has a few columns; saving a partial row would null un-fetched fields and overwrite `*_i18n` locales. i18n-backed fields (description/story/summary/body) have NO plain column — select/write only the `*_i18n` key. Archive button is draft-status entities only (animal_status enum has no 'archived').
- **Broadcast push**: publishing an event/festival/live-stream/offering fires `notify_content_published()` (trigger, migration 021) → `notify-send` `type:'broadcast'` → FCM per-token to all registered devices + `notifications` inbox row for every user. Weekly digest cron `engagement-weekly` Sundays 08:30 IST.
- **Android push layer** (`web/src/lib/push.ts`): creates `pratha_notifications` channel (importance HIGH → heads-up/lock-screen), requests POST_NOTIFICATIONS at login, foreground mirrors FCM via LocalNotifications (FCM is silent in foreground), tap deep-links via `data.route`. `notify-send` FCM payload sets `android.notification.channel_id=pratha_notifications` + optional `image` (big-picture). Topics NOT used — Capacitor 8 plugin doesn't expose them; broadcast fans out over `push_tokens`.
- **push_tokens gotchas**: table cols are `id,user_id,platform,token,last_seen` — no `created_at`/`updated_at`; `token` has a UNIQUE constraint (022) required for the client's `upsert onConflict:'token'`. Capacitor listeners MUST attach before `register()` — FCM delivers cached tokens synchronously.
- **Admin query gotcha: never embed `profiles` via `x:profiles(...)` — `puja_bookings.user_id` (and `notification_outbox.user_id`) reference `auth.users`, not `profiles`, so PostgREST can't resolve the join and 400s the whole query. Fetch profiles separately with `.in('id', userIds)` and join client-side. Also: `puja_offerings` uses `name_i18n`, not `title_i18n`.
- **Demo accounts** (login-page one-tap buttons — REMOVE pre-production): **Explore Admin Console** → `pratha.demo.client@gmail.com` (`editor` role) → lands on `/admin`. **Explore Demo Account** → `pratha.demo.devotee@gmail.com` (plain user) → lands on `/`. Admin demo sets `sessionStorage.postLoginRedirect='/admin'` which Auth.tsx's post-sign-in effect honors (without it the effect's `navigate('/')` races and wins). Also fixed `/admin` roles-gate race: query disabled while user resolves → now waits for `roles !== undefined` before bouncing non-admins.
- **Gotcha**: `name`/`title` columns are GENERATED from `*_i18n` — writes must go to `name_i18n`/`title_i18n` only (buildPayload `continue`s past generated keys when `i18n` is set).
- Per-entity `defaults` fill NOT-NULL non-form columns (currency INR, activities_i18n {}, sponsorship_raised, published_at). `__now__` resolves to current timestamp.
- Images upload to `public-media/cms/{entity}/…` (admin write policy exists). Relation pickers are RLS-scoped (scoped admins only see their own entities).
- Overview tab now shows business metrics (seva ₹ collected, pending/confirmed bookings, Punya issued). Migration 020 adds `audit_log` admin SELECT.

## AI engagement orchestration (added 2026-10-03)

- **`engagement-orchestrator` edge fn** (`supabase/functions/engagement-orchestrator/`, deployed v4, `verify_jwt:false`). Auth: super_admin JWT or `x-notify-secret`. Modes:
  - `plan` — gathers per-user signals (missing `birth_date`, no bookings, referral count, idle days; skips users contacted today) → one `gemini-2.5-flash` call picks each devotee's best next action + drafts title/body/CTA → `notification_outbox` rows (channel `email`, status `pending`). Actions are **index-mapped** to the candidate list — Gemini must not echo userIds (it mutates UUIDs).
  - `send` — drains pending rows: in-app `notifications` row (always) + Resend email + FCM push to `push_tokens`. Retries cap at 3 attempts.
- **Admin → Engagement tab**: Plan Actions / Dispatch Queue buttons (JWT-gated super_admin) + outbox viewer (`web/src/lib/api/admin.ts` → `runOrchestrator`, `getOutbox`).
- **`NotificationBell`** (`web/src/components/NotificationBell.tsx`): unread badge + dropdown over `public.notifications`; tap marks read + navigates `data.cta`. Mobile header + desktop sidebar (`openUp` prop — dropdown must open upward at bottom edge).
- Vault `gemini_api_key` updated to the 2.5-flash key (rishi-ask/kundali-ask share it).
- Note: outbox SELECT uses `is_admin()` — non-super roles see empty queue.
- **Scheduled** (migration 019): `pg_cron` jobs `engagement-plan` (03:30 UTC / 09:00 IST) and `engagement-send` (03:38 UTC) call the fn via `pg_net` with the vault hook secret. `select * from cron.job_run_details` for run history.

- Avatars now show **only** uploaded `profiles.avatar_path`; Google `user_metadata.avatar_url` no longer renders as the user's pfp (it made the profile look complete at first login while ProfileNudge correctly counted only the seeded name).

## Remaining blockers (external)

1. **Razorpay** sandbox key/secret + webhook secret → payment order/webhook Edge Functions + sandbox validation.
2. **Resend SMTP — user must apply settings** (Supabase Auth config can't be changed via MCP; needs dashboard or Management PAT). In Dashboard → Project Settings → Authentication → SMTP Settings, enable custom SMTP: host `smtp.resend.com`, port `465` (or `587`), username `resend`, password = the Resend API key, sender email = an address on a **verified Resend domain** (a send-only key cannot verify domains; without one, `onboarding@resend.dev` only delivers to the account owner's inbox). The key is stored in vault as `resend_api_key` for future notification functions — never committed.
3. **Razorpay** — client-side dependency: client hasn't provided credentials; payment order/webhook Edge Functions stay unimplemented until they do.
4. **Cloudflare account access** for the account owning `utsavam-backend` (wrangler login or API token) → add JWT verification to the Worker AI fallback, or retire it.
5. **Dashboard (user):** Auth Site URL; add `pratha://auth/callback` (or `pratha://**`) to redirect URLs for the Android OAuth flow; enable leaked-password protection (Authentication → Password protection).
6. `npm audit`: 10 moderate findings, not yet triaged.

## Commands

```bash
cd web && npm run dev
cd web && npx tsc -b && npm run lint && npm run build
cd web && node scripts/e2e-hosted.mjs          # hosted E2E; needs confirmed test account env
cd expo && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
cd web && npx cap sync android && cd android && ANDROID_HOME=~/Android/Sdk ./gradlew assembleDebug
```

## Delivery state

- PR #1 merged into `main` (squash `20b4934`); subsequent fixes are pushed to `main`.
- GitHub releases carry the debug APKs (`v1.1.0`, `v1.1.1`). Debug-signed only — Play Store needs a release-signed AAB with the user's keystore.
- No secret values belong in this file or commits.

## Device QA fixes (on-device Redmi Note 13 5G, migration 023)
- **profiles UPDATE grant bug**: migration 005 granted column-level update on a *subset* of
  columns — `birth_date`, `birth_time`, `birth_place` were missing. Every `updateProfile`
  call wrote birth fields → **42501 → ALL profile saves failed** (phone, birth, everything).
  Migration 023 grants the three columns. Symptom reports: "phone won't save", "birth modal
  keeps appearing" — both same root cause.
- **updateProfile field-wipe bug**: it always wrote every column with `|| null` fallbacks, so
  a birth-details save *wiped* `phone` (and vice versa). Now only writes caller-supplied
  fields (`!== undefined` guard).
- **NotificationBell off-screen on mobile**: the mobile header uses `backdrop-blur-xl`,
  which makes it a containing block for `position:fixed` descendants — the notification
  panel rendered relative to the header, not the viewport, i.e. partially off-screen.
  Fixed by portaling the panel to `document.body` (createPortal) + `fixed inset-x-4
  bottom-4` mobile sheet (sm+: anchored dropdown).
- **Profile tab rail**: horizontal scroll rail now has `-webkit-overflow-scrolling:touch`,
  `overscroll-behavior-x:contain`, `touch-action:pan-x` for reliable WebView swiping.
- **janma_ready notification** now fires from both birth-detail save paths
  (BirthDetailsPrompt + Profile Settings) via sendEngagementEmail → in-app + push + email.
- **WebView debugging recipe**: `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`
  then CDP `Runtime.evaluate` — works on debug builds; lets you drive/inspect the app's DOM
  directly. mobile-mcp can't see inside WebViews (accessibility exposes only the WebView
  container), so CDP is the better tool for in-app UI verification.


## Public landing page (added 2026-10-07)

- `/` now routes by auth state (`HomeOrLanding` in `web/src/App.tsx`): signed-out visitors get
  `web/src/features/landing/Landing.tsx`, signed-in devotees keep the `Home` dashboard.
- Landing is a full-bleed editorial page (escapes shell padding via negative margins) with:
  cinematic hero, discovery tile rail, festivals+events rail, maroon Sankalpa conversion band
  (top-3 published pujas with real prices), janma personalization split, dark Live Darshan band,
  Gaushala editorial, Seva participation grid, real-data trust strip, final CTA.
- New tokens: `--color-maroon`, `--color-maroon-deep`, `--color-saffron`, `--color-cream`
  (light + dark variants in `index.css`/`@theme`).
- New API fns in `discover.ts`: `getFestivals()`, `getEvents()` (list queries; detail fns unchanged).
- **Reveal pattern**: CSS scroll-driven `animation-timeline: view()` via `.landing-reveal` —
  content renders visible by default; no JS/IntersectionObserver dependency (learned: framer
  `whileInView` can strand content at opacity:0 in throttled/headless contexts).
- Verified: desktop 1440px + mobile 390px screenshots, all sections render, zero console errors.
- **Imagery audit (2026-10-07)**: cropped YouTube UI chrome off `kashi-vishwanath-aarti.jpg`
  (hero); replaced culturally-wrong/weak tile images — `sanctuary.jpg` was a Japanese-style
  pavilion (now unused on landing), `impact-bg` mandala dropped from Live Darshan tile.
  Current map: Temples→temple-hero, Pujas→kashi-aarti, Live Darshan→rudra-abhishekam,
  Gaushala→fodder-monsoon (tile) + auth-bg feeding photo (section), Seva→healing,
  Festivals→maha-sudarshana.
- **Sacred ambience**: `web/src/features/landing/ambience.ts` synthesizes a tanpura drone
  (Sa 136.1 Hz + Pa + octave shimmer, WebAudio, no copyrighted audio). Off by default;
  user taps the floating control. Swap in a licensed recording later by replacing the engine.
- **LandingFloaters**: floating Rishi orb (bottom-right, opens RishiChatModal) + ambience
  toggle; sits above the mobile bottom nav.
- **Gayatri ambience (2026-10-07)**: user-provided `gayatri.mp3` (39 min, 75MB) trimmed to a
  5-min faded 96kbps loop (~3.6MB) and uploaded to the new public `devotional-audio` Storage
  bucket (`gayatri-mantra.mp3`, migration `devotional_audio_bucket`: public read, admin-only
  write, audio mimes, 8MB cap). `ambience.ts` streams it with RAF volume fades; vercel.json CSP
  gained `media-src https://*.supabase.co`. Local copy removed from `public/`.
- **Ambience UX redesign (2026-10-07)**: replaced the generic speaker toggle with an
  intentional-activation flow — `AmbienceInvitation` pill in the hero ("Enter with the
  Gayatri Mantra") appears once on first visit only (pref === null); tap starts the chant,
  × dismisses permanently. Persistent control is a maroon medallion with breathing
  equalizer bars (not a speaker icon). `ambience.ts` persists `pratha:ambience` = on|off,
  targets 0.32 volume, 2.8s fade-in, suspends/resumes on tab visibility, all activation
  paths are user gestures (mobile-autoplay-safe). RishiChatModal header shows a
  "Begin with the Gayatri Mantra" chip when ambience is off.
- **Seva page rebuild (2026-10-07)**: `/seva` rewritten to landing art direction — dark
  fodder-monsoon hero (explicit cream title fixes light-theme invisible-h1 bug where the
  global `h1 {color: text-primary}` overrode inherited white), real `seva_campaigns` cards
  with goal progress + per-campaign DonationModal preselect, "journey of an offering" steps,
  honest trust strip. Removed ALL fabricated stats (450 cows / 1200kg / 45 treated) — only
  `welfare_stats` real numbers now.
- **Execution ledger (2026-10-07)**: `docs/PRATHA_EXECUTION_CHECKLIST.md` is the canonical
  task queue (vision-PDF aligned). Executed this session: PRATHA-010 (auth context
  preservation — `redirectToLogin` + `?book/?campaign/?sponsor` deep-links reopen modals
  post-sign-in), PRATHA-200 (all routes lazy; Admin own chunk), PRATHA-041 (honest
  pending_payment copy verified), PRATHA-043 (puja deep-link), PRATHA-190 (RLS advisors
  clean), PRATHA-220/221 (prod sweep, zero console errors).
- **QA tooling**: `chromium --headless --screenshot --virtual-time-budget` races real
  network → false blanks. Use playwright-core (`/opt/devin-desktop/resources/app/
  node_modules/playwright-core`) + `--no-sandbox` system chromium + networkidle.
- **Dashboard tasks pending user**: PRATHA-011 Supabase redirect allowlist +
  PRATHA-193 leaked-password toggle; PRATHA-160 Resend domain; PRATHA-042 Razorpay keys.
- **Ledger pass 2 (2026-10-07)**: added `mantras` + `articles` tables (026/027 seeds),
  `saved_items` (025), `profiles.notifications_enabled` (024). New routes /mantras,
  /learn, /learn/:slug; nav extended. `web/src/lib/api/learn.ts` + `panchang.ts`
  (real Schlyter astronomy — the Home card was hardcoded before). Rishi replies can
  carry `LINK:/route|Label` chips; signed-out asks get a real sign-in prompt.
  Admin gained Activity tab (audit_log). Native platforms now land on Home, not
  the marketing page. Remaining launch gates live in PRATHA-240.
- **Release v1.1.8 (2026-10-07)**: debug APK `pratha-v1.1.8.apk` on GitHub Releases —
  versionCode 8 / versionName 1.1.8. Includes Learn/Mantras routes, sadhana streaks,
  saved temples, search, real panchang, Rishi links, notif opt-out; native shell
  routes `/` → Home. No emulator pass this cycle.

## Device QA sweep v1.1.8 (on-device Redmi Note 13 5G, 2026-10-09)

Full matrix + issue ledger: `web/android-testing-v118.md`. Swept launch, discovery,
auth, profile/settings, transactions, admin, notifications, offline/rotation,
aesthetics, and marketing funnel via mobile-mcp + WebView CDP + Supabase MCP.

Fixed during the sweep (all reverified on the rebuilt APK):

- `discover.ts` `mapEvent` — `.map()` on `activities_i18n` threw when events store it
  as a localized object `{"en":[...]}` → every non-demo event page 404'd. Now
  normalizes both shapes and keeps plain-string items.
- `DonationModal.tsx` — never imported `DonationModal.css` → modal rendered inline
  at page bottom, unreachable. Also: state (receiptId/amount) persisted across
  open/close (stale success screen) → reset on `isOpen`; success copy now echoes
  the captured `confirmedAmount`, not live state.
- `Home.tsx` — greeting was hardcoded "Good Morning/सुप्रभातम्" (showed at 18:30).
  Now hour-aware (Morning/Afternoon/Evening + matching Sanskrit).
- `NotificationBell.tsx` — read `data.cta` but broadcasts use `data.route` →
  in-app deep-links dead. Mapper now accepts both keys.
- `push.ts` — token upsert failed whenever the device token was bound to a previous
  account (conflict→UPDATE hits own-row RLS). Now calls SECURITY DEFINER RPC
  `register_push_token` (migration 031) which claims the token for the current user.
  Push-tap deep-link changed from `location.href` (WebView reload hazard) to
  `history.pushState` + `popstate`.
- `notify-send` broadcast — ignored `notifications_enabled`; pushed + inbox-inserted
  for ALL profiles. Now filters opted-out users from both paths.
- Migration 029 — `notifications_enabled` was missing from the profiles column-level
  UPDATE grant → Settings toggle PATCH 403'd silently. Granted.
- Migration 030 — `saved_items` remote table drifted (PK `entity_id uuid`, `create
  table if not exists` no-op in 025) → every save POST 400'd. Re-shaped to
  `entity_slug`/`entity_title` contract (table was empty).

Open issues carried forward (see matrix for severity/repro): 9-item bottom nav (N3),
raw-UUID passport ref (N4), Seva loading-flash + hero contrast (N6/N7), offline error
has no retry button (N13), Home fabricated stat fallbacks (N14), "Devotee Seeker"
placeholder (N15), janma doesn't derive nakshatra (N16), editor sees Plan/Dispatch
buttons that fail (N18). Not exercised live: F3 publish→broadcast + G3 heads-up
(would push to real users), C7 Google sheet, D11 avatar upload, H4 throttling.
