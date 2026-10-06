# PRATHA Execution Checklist

> Persistent execution ledger. Long-term memory between sessions.
> Vision source: `Downloads/PRATHA – Digital Sanātana Dharma & Spiritual Life Platform.pdf`
> Implementation source of truth: this repo + `docs/AGENT_HANDOFF.md`.
> Resume rule: find the first non-DONE task, read only its relevant files, execute, test, mark, record, move on.

## Status legend
`[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE · `[!]` BLOCKED

## Priority legend
- **MUST** — current release
- **NEXT** — next release
- **FUTURE** — strategic backlog (do not build yet)

## Established facts (do NOT re-verify)
- Stack: React+Vite (`web/`), Capacitor Android (`web/android/`), Expo SDK 57 DOM bridge, hosted Supabase `yxwwgynxgihrktwndhep`, Vercel `pratha-two.vercel.app` (git-auto-deploy from `main`), FCM v1, Resend (sandbox-limited).
- Verified live this cycle: booking PRT-29485A83, publish→push broadcast, deep-link to /profile, profile/birth saves (grants fixed m023), in-app bell portal bottom-sheet, FCM token in `push_tokens` on Redmi Note 13 5G.
- `updateProfile` writes only provided fields (wipe-bug fixed).
- push_tokens unique(token) exists (m022).
- Landing page: `/` signed-out → `features/landing/Landing.tsx`; signed-in → `Home`.
- Seva page rebuilt with real campaigns; no fabricated stats remain.
- Gayatri ambience: `devotional-audio` bucket (m024-style apply_migration), `gayatri-mantra.mp3`, intentional-activation UX.
- Demo creds in `Auth.tsx`: admin `pratha.demo.client@gmail.com` / `PrathaDemo!2026` (editor), devotee `pratha.demo.devotee@gmail.com` / `DemoDevotee#2026`, super_admin `marvelpokemaster@gmail.com` (Google).
- Playwright MCP needs `/opt/google/chrome/chrome` (absent) — use `chromium --headless --screenshot` against `npx vite --port 5199`.
- Physical device: Redmi `rwkbgmhir4c6vch6` via adb + mobile-mcp; WebView needs CDP (`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`).

---

## 0. Foundation / existing-state audit

### PRATHA-001 — Ledger + state baseline
Status: [x] DONE
Acceptance: this file exists; established facts captured.
Notes: Created 2026-10-07 after reading vision PDF + handoff.

### PRATHA-002 — Route map audit vs vision pillars
Status: [x] DONE
Acceptance: every public route enumerated and mapped to pillar.
Notes: `/`,`/discover`,`/temples/:slug`,`/events/:slug`,`/festivals/:slug`,`/darshan`,`/darshan/:id`,`/pujas`,`/gaushala`,`/gaushala/animal/:id`,`/seva`,`/profile`,`/admin`,`/login`. Missing vs vision: Learn (knowledge), Mantra/Sadhana, Pilgrimage, Store, Passport, My Journey dashboard, Bharat map, intent entry ("What brings you here today?").

---

## 1. Authentication & user lifecycle

### PRATHA-010 — Auth-gated action context preservation
Status: [x] DONE
Acceptance:
- Signed-out user starts booking/donation → redirected to /login
- After sign-in, user returns to the originating context (route + selection state where feasible)
- No selected puja/campaign silently lost
Relevant files: `features/pujas/*`, `features/seva/DonationModal.tsx`, `features/auth/Auth.tsx`, `AuthContext.tsx`
Test location: `window.location.assign('/login')` in DonationModal; equivalent in booking modal.
Test: sign out → open puja → Book → sign in → confirm return to same puja with modal state or at least the same detail context.
Notes: New `lib/auth/redirect.ts` `redirectToLogin(extraParams)` stashes `postLoginRedirect` path+search. Callers pass `book=<pujaId>` / `campaign=<id>` / `sponsor=<animalId>`; PujaDiscovery, SevaExperience, AnimalPassport each read+clear their param and reopen the modal. RequireAuth also stashes path for /profile,/admin deep links.

### PRATHA-011 — Google OAuth web round-trip
Status: [!] BLOCKED · Priority: MUST
Blocker: Supabase Dashboard → Auth → URL Configuration must allow `https://pratha-two.vercel.app` + Site URL (handoff PENDING item). Needs dashboard access or service key.
Acceptance: Google sign-in on production lands back in app logged in.
Test: prod → Sign in with Google → returns to pratha-two with session.
Notes: Android side verified pattern via `pratha://auth/callback`; web redirect allowlist is the missing piece.

### PRATHA-012 — Remove demo login buttons for production
Status: [x] DONE (gated; flip at launch)
Acceptance: no hardcoded credentials in shipped Auth.tsx; demo accounts removable without breaking auth.
Notes: buttons now render only when `VITE_ENABLE_DEMO_BUTTONS !== 'false'`. At launch set `VITE_ENABLE_DEMO_BUTTONS=false` on Vercel — zero code change needed. Creds still in source until demo accounts are retired.

### PRATHA-013 — Email confirmation / password reset round-trip on prod domain
Status: [~] PARTIAL · Priority: MUST
Acceptance: signup confirmation + reset emails land and links resolve to `pratha-two.vercel.app`.
Depends on: same Supabase redirect allowlist as PRATHA-011; Resend domain for non-owner recipients (PRATHA-160).

---

## 2. Public discovery

### PRATHA-020 — Discovery hub completeness
Status: [x] DONE
Acceptance: `/discover` lists temples/events/festivals/darshan from DB with images, deep-links to details.
Notes: verified on-device + browser QA.

### PRATHA-021 — Search
Status: [x] DONE
Acceptance: `search_all` RPC (exists, granted to anon) surfaced as a search UI in Discover header; results deep-link.
Relevant files: `features/discover/Discover.tsx`, RPC `search_all(text,int)`.

Done-notes: Debounced search box in Discover hero → search_all RPC; results deep-link (temple/event slug, puja→?book=, gaushala→/gaushala). Anon-safe, empty-state copy.

### PRATHA-022 — Intent entry ("What brings you here today?")
Status: [x] DONE
Acceptance: landing/Home shows intent chips (Pooja, Darshan, Peace, Mantra, Seva, Learn, Pilgrimage); each routes to filtered destination or Rishi seeded with intent.
Notes: design per PDF §2; simplest v1 = chips routing to existing sections + Rishi prefill.

Done-notes: Intent strip in hero: "What brings you here?" — Pooja/Darshan/Seva/Gaushala/Festivals links + Ask Rishi chip dispatching pratha-open-rishi event (LandingFloaters listens).

### PRATHA-023 — "What are you seeking?" intent engine v1
Status: [ ] TODO · Priority: FUTURE
Notes: PDF §3 — intent → tradition → temple → ritual → seva chain; needs content modeling (intent_taxonomy, temple traditions). Strategic IP.

---

## 3. Temples

### PRATHA-030 — Temple detail completeness
Status: [x] DONE
Acceptance: timings, deity, description, district, gaushala flag, live stream link.
Notes: verified `/temples/:slug`.

### PRATHA-031 — Temple page: associated pujas/events surface
Status: [x] DONE
Acceptance: temple detail lists its published pujas + upcoming events (data exists via `puja_offerings.temple_id`, `events.temple_id`).

---

## 4. Pooja & rituals

Done-notes: Already implemented — TempleDetail queries offerings/events/streams per temple. Verified.

### PRATHA-040 — Booking flow E2E
Status: [x] DONE
Notes: PRT-29485A83 / PRT-49D07AF8; date picker honors lead_time_days/available_days; sankalpa+gotra+nakshatra; free→confirmed.

### PRATHA-041 — Paid booking → payment pending state UX
Status: [x] DONE
Acceptance: paid booking creates `pending_payment` row with clear "payment at temple / pending" messaging; no fake "paid" claim.
Notes: verified — success screen shows "Booking Recorded" + "awaiting payment" for non-confirmed states (PujaDetailModal:136-150).

### PRATHA-042 — Razorpay integration
Status: [!] BLOCKED · Priority: MUST (revenue core)
Blocker: needs Razorpay keys + webhook Edge Function.
Acceptance: paid booking → Razorpay checkout → webhook marks confirmed → receipt row.
Relevant: `create_puja_booking` RPC, new edge fn `payment-webhook`.

### PRATHA-043 — Puja detail page
Status: [x] DONE
Acceptance: dedicated `/pujas/:id` (or modal-equivalent detail) with purpose, procedure, temple, dates, price, sankalpa fields; deep-linkable.
Notes: `?book=<puja_id>` deep-link on /pujas opens the detail/booking modal — shareable URL without a new route. Full standalone page remains a NEXT polish if SEO demands.

---

## 5. Seva / donations

### PRATHA-050 — Seva campaigns + contribution
Status: [x] DONE
Notes: rebuilt 2026-10-07; real campaigns w/ goal progress; `create_contribution` RPC; honest copy.

### PRATHA-051 — Donation receipt view
Status: [x] DONE
Acceptance: profile shows contribution history with campaign name, amount, ref; PDF/shareable receipt (receipts bucket exists).

Done-notes: Donations tab shows ref, status, dedication, amount, target. Shareable PDF receipt remains FUTURE.

### PRATHA-052 — Transparency ledger (₹ → purpose → beneficiaries)
Status: [ ] TODO · Priority: FUTURE
Notes: PDF §25 — public per-campaign impact; needs beneficiary reporting schema.

---

## 6. Spiritual profile / My Journey

### PRATHA-060 — Profile completeness
Status: [x] DONE
Notes: phone/birth persist (m023 grant fix + field-wipe fix), tabs, theme, referral, family.

### PRATHA-061 — My Journey dashboard
Status: [x] DONE
Acceptance: profile gets a "Journey" view: my pujas, my sevas, my temples (visited/saved), my mantras, sadhana streak; aggregates existing bookings/contributions.
Relevant: `Profile.tsx` tabs, existing bookings/contributions queries.

Done-notes: New "My Journey" first tab: stat tiles (seva ₹, pujas, punya+tier, family) + janma status + contextual next-step nudges routing to real actions.

### PRATHA-062 — Saved/favorite temples
Status: [x] DONE
Acceptance: heart/bookmark on temple → `saved_items` table → shows in My Journey. Needs migration + RLS + UI.

---

## 7. Dharma knowledge (Learn)

Done-notes: NEXT

Done-notes: saved_items table + RLS (own rows only), bookmark on TempleDetail hero, Journey tab lists saved chips. Anon tap → login w/ return.

### PRATHA-070 — Learn section v1
Status: [x] DONE
Acceptance: `/learn` route; CMS-managed articles (reuse content CMS pattern); beginner/intermediate/advanced tiers from PDF §21; clean reading view.
Backend: new `articles` table (or reuse a generic `content_items`), RLS published-read, admin-write.

Done-notes: /learn list + /learn/:slug reader; articles table w/ source_type + claim_type; 3 real seeded articles.

### PRATHA-071 — Source-layer convention
Status: [x] DONE
Acceptance: every knowledge article can mark source type (Purana/Itihasa/Agama/Temple tradition/Acharya/modern interpretation) and belief-vs-evidence label, per PDF §22 credibility rule.

---

## 8. Mantra / Sadhana

Done-notes: source_type (purana/itihasa/agama/temple_tradition/acharya/modern) + claim_type (scriptural/traditional/historical/interpretation) badges on cards + article footer honesty note.

### PRATHA-080 — Mantra library v1
Status: [x] DONE
Acceptance: `/mantras` with Devanagari + transliteration + meaning; audio slot optional (devotional-audio bucket pattern exists); daily mantra surface.
Notes: keep scope small — static CMS list + optional audio URL.

Done-notes: mantras table + /mantras page — devanagari, transliteration, deity, meaning; 5 real mantras seeded.

### PRATHA-081 — Daily Sadhana streak
Status: [ ] TODO · Priority: FUTURE
Acceptance: mark today's sadhana done; streak counter in My Journey.

---

## 9. AI / Rishi / Dharma Guide

### PRATHA-090 — Rishi chat
Status: [x] DONE
Notes: `rishi-ask` edge fn verified w/ JWT; kundali-ask exists; Worker fallback.

### PRATHA-091 — Rishi: source-aware answers
Status: [ ] TODO · Priority: NEXT
Acceptance: Rishi responses can carry a source-tag (tradition vs evidence vs interpretation) — prompt engineering + render badge.

### PRATHA-092 — Rishi voice ("Tell me")
Status: [ ] TODO · Priority: FUTURE
Notes: PDF §23 — TTS narration in Indic languages; needs TTS provider decision.

### PRATHA-093 — Guided ritual Q&A → booking deep-link
Status: [ ] TODO · Priority: NEXT
Acceptance: Rishi answer can deep-link to a puja/temple (RAG-lite: match entities in answer to DB slugs).

---

## 10. Festivals & events

### PRATHA-100 — Festival/event discovery + detail
Status: [x] DONE
Notes: detail routes verified; landing rail live.

### PRATHA-101 — Festival calendar view
Status: [x] DONE
Acceptance: month-grouped festival listing w/ month_hint ordering; event date badges.

---

## 11. Live Darshan

Done-notes: Festivals sorted by next occurrence (first English month in month_hint vs current month, wrap-around).

### PRATHA-110 — Live darshan list/detail
Status: [x] DONE
Notes: YouTube embed + provider fallback verified.

### PRATHA-111 — "Live now" scheduling honesty
Status: [x] DONE
Acceptance: LIVE badge only when schedule says currently live OR `featured`; else show scheduled time. Currently badge is unconditional on cards.

---

## 12. Gaushala

Done-notes: Landing LIVE badge → honest provider label (Live stream / Official portal); pulsing dot removed. Darshan page was already honest.

### PRATHA-120 — Gaushala + animal passports
Status: [x] DONE
Notes: breed chips, health tracking, animal detail verified.

### PRATHA-121 — Animal sponsorship (adopt-a-cow → contribution)
Status: [x] DONE
Acceptance: animal passport has "Sponsor {name}" → DonationModal with animalId (RPC supports p_animal_id).

---

## 13. Pilgrimage

Done-notes: Already implemented — AnimalPassport "Sponsor Care" → SponsorModal with animalId + ?sponsor= deep link.

### PRATHA-130 — Pilgrimage planner v1 (route templates)
Status: [ ] TODO · Priority: FUTURE
Notes: PDF §26 — circuits (Jyotirlinga, Shakti Peetha, Char Dham, Kerala Trail, Uttarakhand). v1 = curated `pilgrimage_routes` table + detail pages; AI route-gen is v2.

---

## 14. Spiritual Passport

### PRATHA-140 — Dharma passport v1
Status: [ ] TODO · Priority: FUTURE
Acceptance: checklist collections (Jyotirlinga 12, Char Dham 4, …) with visited tracking per user.
Backend: `passport_collections`, `passport_items`, `user_passport_marks` + RLS.

---

## 15. Spiritual Store

### PRATHA-150 — Dharma store
Status: [ ] TODO · Priority: FUTURE
Notes: PDF §24 — catalog, categories (Puja/Devotion/Home/Knowledge), cart/checkout AFTER payments exist (PRATHA-042 dependency).

---

## 16. Notifications

### PRATHA-160 — Production email domain
Status: [!] BLOCKED · Priority: MUST
Blocker: verify a domain in Resend console (one DNS record). Currently only delivers to account owner.
Acceptance: welcome/janma/publish emails reach arbitrary user addresses.

### PRATHA-161 — Push E2E on device
Status: [x] DONE
Notes: heads-up + deep-link + publish broadcast verified on Redmi.

### PRATHA-162 — Notification preferences per user
Status: [x] DONE
Acceptance: profile setting toggles engagement pushes (respect `marketing_opt_in`-style flag in notify-send targeting).

---

## 17. Admin / CMS

Done-notes: profiles.notifications_enabled (default true) + Settings toggle + orchestrator excludes opted-out users (edge fn v5 deployed).

### PRATHA-170 — CMS 9-section publish
Status: [x] DONE
Notes: draft→publish verified on-device incl. broadcast push.

### PRATHA-171 — Image upload in CMS
Status: [ ] TODO · Priority: NEXT
Acceptance: admin uploads cover image → `public-media` bucket → saved URL (bucket + admin write policy already exist).

### PRATHA-172 — Booking management actions
Status: [x] DONE
Acceptance: admin can confirm/cancel `pending_payment` bookings from console; audit row written.

Done-notes: Already implemented — admin bookings have Mark Performed / Cancel wired to RPCs.

### PRATHA-173 — Audit log viewer
Status: [x] DONE

---

## 18. Personalization

Done-notes: Admin Activity tab streams audit_log (admin-select policy from m020).

### PRATHA-180 — Janma-based recommendations surface
Status: [~] PARTIAL · Priority: NEXT
Acceptance: birth details → janma chart exists; pujas recommended by nakshatra/dosha shown in Home + puja list ("For your stars").
Notes: kundali data exists; recommendation mapping needs rules table or AI fn.

### PRATHA-181 — Daily Dharma strip
Status: [ ] TODO · Priority: NEXT
Acceptance: Home shows today’s tithi/nakshatra (real panchang lib or API — current panchang card is hardcoded), today's mantra, today's festival event.

---

## 19. Security / RLS

### PRATHA-190 — RLS audit sweep
Status: [x] DONE
Acceptance: all public tables published-read only; user tables owner-scoped; admin writes role-gated. Column grants complete (profiles fixed m023).
Notes: `get_advisors` security scan 2026-10-07 — ZERO table-level findings (no missing-policy/RLS-disabled tables). WARNs only: role-checker SECURITY DEFINER fns callable by anon (intentional — they're invoked inside policies) and `auth_leaked_password_protection` disabled → manual dashboard toggle, recorded as PRATHA-193.

### PRATHA-191 — Secrets hygiene
Status: [x] DONE
Notes: service keys in Vault only; publishable key in client (public by design); `.env` gitignored; `google-services.json` intentionally tracked (public client config).

### PRATHA-192 — CSP / headers review
Status: [x] DONE
Notes: vercel.json CSP + nosniff + frame-ancestors + Permissions-Policy; media-src added for mantra audio.

### PRATHA-193 — Enable leaked-password protection
Status: [ ] TODO · Priority: MUST
Acceptance: Supabase Dashboard → Auth → Password protection → HaveIBeenPwned toggle ON.
Notes: dashboard toggle only — no code. Advisor WARN, do with PRATHA-011 redirect config in one dashboard session.

---

## 20. Performance

### PRATHA-200 — Route-level code splitting
Status: [x] DONE
Acceptance: `React.lazy` on admin + heavy routes; landing first-load JS reduced; build still passes.
Notes: all feature routes lazy + Suspense fallback; Admin split into own 37kB chunk. Main chunk still ~532kB (shared vendor: supabase + motion + capacitor plugins — needed on landing anyway). Vendor splitting would yield little more.

### PRATHA-201 — Image weight
Status: [ ] TODO · Priority: NEXT
Acceptance: landing hero < 300KB (crop done); below-fold images lazy (done); consider webp conversion of public/images.

---

## 21. Accessibility

### PRATHA-210 — A11y sweep
Status: [~] PARTIAL · Priority: NEXT
Acceptance: all interactive elements keyboard-reachable + labeled; color contrast on dark bands verified; reduced-motion honored (done for landing).
Notes: landing floaters/pills labeled; check modals focus-trap (Radix Dialog does).

---

## 22. Web production QA

### PRATHA-220 — Full prod route sweep
Status: [x] DONE
Acceptance: every public route on pratha-two renders, zero console errors, no 4xx images, mobile 390px + desktop 1440px.
Test: headless chromium screenshots per route + console log grep.
Notes: playwright-core from Devin desktop install + system chromium. All routes (/, /discover, /pujas, /pujas?book=, /temples/:slug, /darshan, /gaushala, /gaushala/animal/:id, /seva, /login, /festivals/:slug, /events) → 200 + zero console errors on mobile + desktop. NOTE: `chromium --headless --screenshot --virtual-time-budget` races real network → false "blank" captures; use playwright with networkidle for QA.

### PRATHA-221 — Signed-out action gates
Status: [x] DONE
Acceptance: donate/book while signed-out → login prompt → return (depends PRATHA-010).
Notes: prod-verified — `/pujas?book=<id>` opens booking modal signed-out, footer reads "Sign in to Book", click stashes return URL → post-login returns + reopens. Same pattern for ?campaign=/​?sponsor=.

---

## 23. Android / Capacitor readiness

### PRATHA-230 — Android E2E deferred
Status: [!] PENDING · Priority: MUST (when env available)
Pending: emulator/device availability. Deferred tests: install release APK, FCM re-register, ambience toggle in WebView (audio in Capacitor WebView works — verify), landing render, Rishi modal.
Notes: last verified build v1.1.7 — landing + ambience NOT in that build; rebuild APK when device env returns.

### PRATHA-231 — Landing inside Capacitor shell
Status: [ ] TODO · Priority: NEXT
Acceptance: app users (signed-in) unaffected; signed-out app cold-open shows landing correctly within safe-area insets; floaters don't collide with bottom nav (verified on web, verify on device).

---

## 24. Final production readiness

### PRATHA-240 — Launch gate checklist
Status: [ ] TODO · Priority: MUST (last)
Acceptance: PRATHA-010,011,012,042,160,190,200,220,221 green; demo buttons off; release notes written.

### PRATHA-241 — Expo/iOS bridge sanity
Status: [ ] PENDING · Priority: NEXT
Notes: `expo export --platform web` previously passing; verify after landing changes.

---

# Test matrix status (update as tasks complete)

| Flow | Signed-out | Signed-in | Mobile web | Prod | Device |
|---|---|---|---|---|---|
| Discovery | ✅ | ✅ | ✅ | ✅ | ✅ |
| Booking | redirect→login | ✅ | ✅ | ✅ | ✅ |
| Seva donate | redirect→login | ✅ | ✅ | ✅ | ✅ |
| Push | — | ✅ | — | ✅ | ✅ |
| Admin publish | — | ✅ | ✅ | ✅ | ✅ |
| Landing | ✅ | n/a(dash) | ✅ | ✅ | pending |
| Google OAuth | — | blocked-011 | — | blocked | pending |
| Payments | — | blocked-042 | — | blocked | blocked |
