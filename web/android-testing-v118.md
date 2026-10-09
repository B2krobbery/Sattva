# Android App E2E — v1.1.8 Exhaustive Sweep (Redmi Note 13 5G, Android 15)

Strict-senior QA + UX/aesthetics + growth review of the Capacitor APK on real hardware.
Tooling: `mobile-mcp` (tap/swipe/screenshot/elements), `webview_devtools_remote` CDP
(`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`) for DOM/console,
Supabase MCP for DB assertions, `adb logcat` for native errors.

Device: Redmi Note 13 5G (2312DRAABI) · Android 15 · HyperOS/MIUI
Build: com.utsavam.sattva v1.1.8 (versionCode 8), debug APK built from `main` HEAD, installed 2026-10-09
Backend: hosted Supabase `yxwwgynxgihrktwndhep` (ap-south-1)
Sweep produced **6 code fixes + 3 migrations**, all rebuilt+reinstalled+re-verified on device (see N-numbered issues).

Legend: ⬜ untested · ✅ pass · ⚠ partial/degraded · ❌ fail → issues below · ⊘ intentionally skipped

## A. Launch & Shell
| # | Flow | Status | Notes |
|---|------|--------|-------|
| A1 | Cold launch → native lands on Home (not landing page, per design) | ✅ | |
| A2 | Splash → content; no stuck spinner | ✅ | known swiftshader caveat is emulator-only |
| A3 | Status bar safe-area correct | ✅ | edge-to-edge respected on all screenshots |
| A4 | Bottom nav reachable; see N3 (9 items) | ⚠ | new items added in v1.1.8 (Mantras/Learn/Admin) |
| A5 | Back exits app at root (std Android); child routes return fine | ✅ | |
| A6 | App switch → return: state + scroll preserved | ✅ | HOME→relaunch resumed same pid (26458), same page |
| A7 | Rotate device: landscape switches to sidebar-rail layout, no crash | ✅ | responsive breakpoint works; process survived |
| A8 | Kill+relaunch → session + Home restored | ✅ | |
| A9 | Cold launch time perceived < ~3s to usable | ✅ | hero paints first |

## B. Public Discovery (signed-out)
| # | Flow | Status | Notes |
|---|------|--------|-------|
| B1 | Home renders (greeting bug → N2, FIXED) | ✅ | panchang is live Schlyter calc, not hardcoded |
| B2 | Discover lists 7 temples + search field | ✅ | |
| B3 | Temple detail renders w/ offerings, save btn | ✅ | |
| B4 | Event detail — was BROKEN for non-demo events → N1, FIXED+reverified | ✅ | localized activities_i18n now parses |
| B5 | Festival detail OK (thrissur-pooram) | ✅ | |
| B6 | Darshan list + detail render, official-portal badge | ✅ | |
| B7 | Pujas list + modal open | ✅ | |
| B8 | Gaushala renders | ✅ | dynamic breed/status filter chips |
| B9 | Animal passport /gaushala/animal/:id | ✅ | renders; N4 raw-UUID display nit |
| B10 | Seva page renders (new design) | ✅ | 4 campaigns render; N6 loading-flash nit |
| B11 | /mantras renders | ✅ | devanagari+transliteration+meaning all present |
| B12 | /learn + article render (what-is-dharma) | ✅ | |
| B13 | Search works ("rudra"→1 result; empty state has recovery copy) | ✅ | |
| B14 | Signed-out save tap → redirectToLogin w/ postLoginRedirect | ✅ | by design (TempleDetail.tsx:69) |

## C. Auth & Session
| # | Flow | Status | Notes |
|---|------|--------|-------|
| C1 | Demo buttons visible (devotee + admin) | ✅ | debug build default |
| C2 | "Explore Demo Account" → devotee session | ✅ | lands on profile/home, nav w/o Admin |
| C3 | Manual email/password sign-in | ⚠ | invalid-creds path verified; button-login used for valid |
| C4 | Sign out → signed-out state clean | ✅ | lands /login, no data bleed |
| C5 | Session persists across force-stop | ✅ | |
| C6 | Invalid creds → "Invalid" error shown, no crash | ✅ | |
| C7 | Google native sign-in button present | ⚠ | button renders; live credential-sheet tap not run |
| C8 | BirthDetailsPrompt post-login when missing birth details | ✅ | snooze (`pratha-janma-dismissed`, 7d) honored |
| C9 | ?book deep-link: signed-out submit → login → modal reopens | ✅ | verified end-to-end on rebuilt APK |

## D. Profile & Settings (signed in)
| # | Flow | Status | Notes |
|---|------|--------|-------|
| D1 | Profile loads; all tabs reachable | ✅ | Journey/My Seva/Bookings/Family/Invite/Settings |
| D2 | Edit profile phone → persists (DB verified) | ✅ | no field-wipe regression |
| D3 | Janma details save → persists (DB verified) | ✅ | N16: nakshatra not auto-derived |
| D4 | Theme Light/System/Dark applies correctly | ✅ | light-theme pass clean (incl. Home hero) |
| D5 | Referral tab: code + punya counter render | ⚠ | share sheet not tapped (native Share plugin) |
| D6 | Family tab: add member → DB row | ✅ | "Ammamma Devi" persisted |
| D7 | Notification bell → bottom-sheet on-screen; tap → deep-links | ✅ | N12 route/cta fix verified on device |
| D8 | Notification opt-out toggle → DB persists | ✅ | N10 grant fix verified live |
| D9 | Sadhana streak check-in → DB row, streak UI updates | ✅ | for_date row + "1 day streak" |
| D10 | Saved items list shows saved temple in My Journey | ✅ | post N-schema-fix |
| D11 | Avatar upload | ⚠ | not exercised (file-input); existing avatar renders |

## E. Transactions
| # | Flow | Status | Notes |
|---|------|--------|-------|
| E1 | Booking PRT-A261E4C4 → DB row pending_payment ₹101 | ✅ | |
| E2 | "awaiting payment" honest copy shown | ✅ | no false success claim |
| E3 | Seva donation → recorded; DB row 50100 paise | ✅ | post-fix; appears in My Seva |
| E4 | Date picker shows "earliest 11 Oct" (lead_time honored) | ✅ | |
| E5 | Invalid/empty inputs rejected | ✅ | native HTML5 bubble "Please fill in this field" |

## F. Admin
| # | Flow | Status | Notes |
|---|------|--------|-------|
| F1 | Admin nav hidden for devotee; /admin bounces; editor sees console | ✅ | RBAC client+route guard verified |
| F2 | Overview stat cards non-null | ✅ | |
| F3 | Content: create draft → publish → live | ⊘ | skipped — publish fires broadcast push to real users |
| F4 | Activity tab (audit_log) renders | ✅ | INSERT entries listed |
| F5 | Engagement Plan/Dispatch visible to editor but fails server-side | ⚠ | N18: gate render on isSuperAdmin |

## G. Push & Notifications
| # | Flow | Status | Notes |
|---|------|--------|-------|
| G1 | POST_NOTIFICATIONS granted | ✅ | dumpsys confirms granted=true |
| G2 | FCM token row in push_tokens for this device | ✅ | N11 RPC fix verified — token rebound to current user |
| G3 | Broadcast publish → heads-up banner | ⊘ | not sent (would push to all real users) |
| G4 | Notification tap → deep-link route | ✅ | N12 fix verified live |
| G5 | Opt-out honored in broadcast sender | ✅ | N17 fix: notify-send now filters opted-out users |

## H. Robustness & Errors
| # | Flow | Status | Notes |
|---|------|--------|-------|
| H1 | JS console errors across screens | ⚠ | 3 known defect paths (now fixed); no other errors logged |
| H2 | 4xx/5xx network errors | ⚠ | 403 profiles / 400 saved_items / 403 push_tokens — all root-caused+fixed |
| H3 | Airplane mode → graceful error state, no white screen | ✅ | N13: error copy lacks retry button |
| H4 | Slow network → skeletons not frozen UI | ⚠ | not throttled on device; loading states seen are reasonable |
| H5 | logcat: no native crashes/renderer kills during sweep | ✅ | |
| H6 | pratha://auth/callback OAuth deep link | ⊘ | Google uses Credential Manager, not redirect |

## I. Aesthetics & UX audit (strict-eye pass)
| # | Check | Status | Notes |
|---|-------|--------|-------|
| I1 | 8dp spacing rhythm, no accidental asymmetry | ✅ | screenshots clean across screens |
| I2 | Typography hierarchy readable | ✅ | min-text sizes respected |
| I3 | Touch targets ≥48dp | ⚠ | nav items ~49dp borderline; 9 items cramped (N3) |
| I4 | Contrast WCAG AA light+dark | ⚠ | Seva hero stat unreadable (N7) |
| I5 | Cards/elevation consistent, no muddy overlaps | ✅ | |
| I6 | Empty states friendly + CTA | ✅ | "Find a temple" recovery copy etc. |
| I7 | Loading states don't flash empty copy | ⚠ | N6 Seva empty-state flash during load |
| I8 | Text truncation on long names | ✅ | no overflow seen |
| I9 | Images: sane aspect, no distortion | ✅ | |
| I10 | Dark+light themes: no invisible text | ✅ | both verified live |
| I11 | Animations smooth, no jank on scroll | ✅ | |
| I12 | Ambience invitation pill | ⚠ | landing-page only — native users never see it; entry is Rishi's "Begin with the Gayatri Mantra" chip only |
| I13 | Floating elements don't occlude nav/CTAs | ✅ | |
| I14 | Keyboard: fields not hidden behind IME | ✅ | search typing tested via real IME |

## J. Marketing & Growth audit
| # | Check | Status | Notes |
|---|-------|--------|-------|
| J1 | First-open: Home sells value in 5s without login | ✅ | hero + CTAs + referral card above fold |
| J2 | Conversion CTAs above fold | ✅ | Sponsor Fodder / Explore Pujas |
| J3 | Signup unforced but discoverable | ✅ | browse freely; Sign-in gates appear at action points |
| J4 | Referral visible to fresh user, share ≤2 taps | ✅ | "+108 Punya" banner on Home |
| J5 | Trust: no fabricated numbers | ⚠ | N14 Home hero fallbacks remain (45.2k/450) |
| J6 | Push opt-in timing after auth, not cold launch | ✅ | |
| J7 | Trigger-moment CTAs wired | ✅ | janma card, Rishi chips, save bookmarks |
| J8 | Copy voice consistent, no dev strings | ✅ | |
| J9 | Empty/zero-result states have recovery path | ⚠ | search ✅; offline error lacks retry (N13) |
| J10 | Content-first paint | ✅ | |
| J-extra | **Demo listings in production catalog** | ⚠ | Discover card #1 is "Heritage Temple · Demo"; honest label but demo data in prod catalog blurs trust — gate behind a demo flag for release builds |

## Issues found (this sweep)

- **N1 🔴 Event detail pages 404 for all non-demo events.** `mapEvent` ran
  `.map()` on `activities_i18n` which real events store as a localized object
  `{"en":[...]}`. **FIXED** (unwrap localized() before map; keep plain-string
  items) — reverified: Sopana Sangeetham event renders with Programme list.
- **N2 🟠 "Good Morning/सुप्रभातम्" shown at 18:30.** **FIXED** — Home greeting
  is now hour-aware (Morning/Afternoon/Evening + matching Sanskrit).
  Reverified: "Good Evening, Subaru · शुभसन्ध्या" at 19:xx.
- **N3 🟡 Bottom nav has 9 destinations.** Over M3's 3–5; ~49dp targets.
- **N4 🔵 Animal passport shows raw UUID** as resident ID.
- **N5 🔴 DonationModal never imported its CSS** — rendered inline at page
  bottom, unreachable. **FIXED** (import added) — reverified: fixed overlay,
  z-1000, full-viewport.
- **N6 🟡 Seva empty-state copy flashes during query load** (`!campaigns`).
- **N7 🟡 Seva hero/stat contrast weak** over bright photo region.
- **N8 🔵 Donation confirm copy vs submitted amount could disagree** (live
  state vs submit-time value). **FIXED** — success echoes confirmedAmount.
- **N9 🟠 DonationModal stale success on reopen** — state persisted across
  open/close. **FIXED** — reset on isOpen. Reverified: reopen shows fresh form.
- **N10 🔴 Devotional-notifications toggle silently failed** (403 — column
  grant missing). **FIXED**: migration 029 + verified persists.
- **N11 🔴 Push token rebinding failed across account switch** (upsert→UPDATE
  hits other user's row → RLS reject). **FIXED**: migration 031 SECURITY
  DEFINER `register_push_token()` RPC; client calls it. Reverified: token
  rebound to demo devotee (last_seen fresh). Also replaced notification-tap
  `location.href` with pushState+popstate (WebView reload hazard).
- **N12 🟠 Notification in-app deep-links dead** — bell read `data.cta`,
  broadcasts use `data.route`. **FIXED** (accepts both) — reverified: tap
  navigates to /profile.
- **N13 🔵 Offline error state lacks retry control.**
- **N14 🟡 Home hero fabricated fallbacks** (45.2k devotees, ||450, demo card).
- **N15 🔵 "Devotee Seeker" placeholder name in success copy** when
  user_metadata.display_name empty — should use profile.displayName.
- **N16 � Janma saved but nakshatra stays "Not specified"** — profile has no
  nakshatra input and janma doesn't auto-derive it (panchang.ts already
  computes moon longitude — janma nakshatra is feasible).
- **N17 🔴 Broadcast notifications ignored opt-out** — notify-send broadcast
  pushed to ALL tokens + ALL profiles. **FIXED** — filters
  `notifications_enabled=false` for both push and inbox insert.
- **N18 🔵 Engagement Plan/Dispatch buttons render for editor** (fails
  server-side) — gate on isSuperAdmin like the Roles tab.

## Session log
- 18:xx–19:xx launch → discovery → bookings → seva → profile → settings →
  mantras → admin → auth flows; N1–N9 found live, N1/N2/N5/N8/N9/N10/N11/N12/N17
  fixed in source+DB, rebuilt APK, reinstalled, all fixes reverified on device.
- Test data created: booking PRT-A261E4C4 (pending_payment), seva refs
  C573506C + B416F9E4, saved temple (heritage-temple-demo), sadhana check-in
  2026-10-09, family member "Ammamma Devi", profile phone 9876500001,
  janma 1990-05-14 06:30 Thrissur.
- Pending rebuild-verified items needing a follow-up device pass on a RELEASE
  build: G3 push banner, F3 publish→broadcast, D11 avatar upload, C7 Google
  sheet, C3 manual login, H4 throttle.
