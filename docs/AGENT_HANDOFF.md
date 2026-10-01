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

## Deployment (Vercel)

- `web/vercel.json` — Vite SPA config: `dist` output, catch-all rewrite to `index.html`, immutable asset caching. Set Vercel project **Root Directory to `web/`**. Env vars (optional — source has fallbacks): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- After first deploy, add the Vercel domain to Supabase Auth Site URL / redirect URLs or Google OAuth + magic links won't return to the web app.

## Known layout trap (fixed 2026-10-01)

- `index.css` had `* { margin: 0; padding: 0 }` as **unlayered** CSS, which beats all `@layer utilities` rules — silently killed every Tailwind margin utility (incl. `md:ml-64`, `mx-auto` centering). Removed; Tailwind preflight already resets. If spacing ever looks wrong on desktop, suspect cascade-layer issues first.
- Minimum text size is now 11px (`text-[10px]`→`text-[11px]` on nav labels, badges, chips).

## Android edge-to-edge & theme

- `@capawesome/capacitor-android-edge-to-edge-support` is required on Android 15+: Android WebView never populates `env(safe-area-inset-*)`; the plugin injects real insets so the existing `env()` CSS works. Without it the header renders under the status bar.
- Theme is `data-theme`-driven (`web/src/lib/theme.ts`), not `prefers-color-scheme` media queries: `localStorage["pratha-theme"]` = `light|dark|system`; `index.html` sets `data-theme` before first paint; dark tokens live under `:root[data-theme='dark']`; `@custom-variant dark` makes Tailwind `dark:` utilities follow the attribute. Settings tab → Appearance segmented control. `@capacitor/status-bar` syncs status-bar icon contrast.
- `/profile` is wrapped in `RequireAuth` (redirects to `/login` signed-out) — other routes stay public by design; booking/contribution modals gate per-action.
- `.action-tile` is shared by `<Link>` and `<button>` (Rishi tile); it needs `text-align: left`/`font: inherit` normalization or the button centers its text.

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
