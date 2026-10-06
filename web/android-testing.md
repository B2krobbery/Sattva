# Android App E2E — Physical Device (Redmi Note 13 5G, Android 15)

Strict-senior review sweep of the Capacitor APK on real hardware.
Tooling: `mobile-mcp` (tap/swipe/screenshot), `webview_devtools_remote` CDP
(`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`),
Supabase MCP for DB assertions, `adb logcat` for native errors.

Legend: ✅ pass · ❌ fail · ⚠ partial/degraded · ⬜ untested

## A. Launch & Shell
| # | Flow | How to verify | Status |
|---|------|---------------|--------|
| A1 | Cold launch → Home renders | screenshot: panchang card, greeting, CTAs | ✅ |
| A2 | Splash/status bar safe-area | screenshot: header not under status bar | ✅ |
| A3 | Bottom nav labels+icons visible | screenshot: Home/Discover/Pujas/Gaushala/Seva/Profile/Admin | ⬜ |
| A4 | Rotate/back handling sane | back press from child route returns, no crash | ⬜ |
| A5 | App resume (background → foreground) | home → app switch → return, state intact | ⬜ |

## B. Public Discovery
| # | Flow | Status |
|---|------|--------|
| B1 | Home: panchang card, referral card, quick actions | ⬜ |
| B2 | Discover: temples/events/festivals listed | ⬜ |
| B3 | Temple detail page loads | ⬜ |
| B4 | Event detail page loads | ⬜ |
| B5 | Festival detail page loads | ⬜ |
| B6 | Darshan list + live stream detail | ⬜ |
| B7 | Pujas list + detail modal | ⬜ |
| B8 | Gaushala herd + dynamic breed filters | ⬜ |
| B9 | Animal passport page | ⬜ |
| B10 | Seva campaigns + donate sheet opens | ⬜ |

## C. Auth & Profile
| # | Flow | Status |
|---|------|--------|
| C1 | Sign out → sign in (demo button) works | ⬜ |
| C2 | Profile page loads; all 5 tabs reachable (rail scrolls) | ⬜ |
| C3 | Settings: edit name/phone/city/gotra → persists in DB | ⬜ |
| C4 | Settings: birth details → persists + modal never reappears | ⬜ |
| C5 | Theme switch Light/System/Dark applies | ⬜ |
| C6 | Referral tab: code + share sheet | ⬜ |
| C7 | Family tab: add member form works | ⬜ |
| C8 | Notification bell → panel renders in-viewport | ⬜ |
| C9 | Notification tap → deep-links to route | ⬜ |

## D. Transactions
| # | Flow | Status |
|---|------|--------|
| D1 | Book a puja → "Sankalpa Accepted" + ref in bookings tab | ⬜ |
| D2 | Seva donation → recorded in My Seva tab | ⬜ |
| D3 | Admin: Content → create puja → publish → live on /pujas | ⬜ |
| D4 | Admin: Bookings tab shows rows with devotee names | ⬜ |

## E. Push & Notifications
| # | Flow | Status |
|---|------|--------|
| E1 | POST_NOTIFICATIONS granted; prompt on login if denied | ⬜ |
| E2 | FCM token in push_tokens for current user | ⬜ |
| E3 | Broadcast → heads-up banner (backgrounded app) | ⬜ |
| E4 | Broadcast while app open → mirrored local notif | ⬜ |
| E5 | Notification tap → deep-link route | ⬜ |
| E6 | Lock-screen visibility | ⬜ |
| E7 | No SCHEDULE_EXACT_ALARM settings prompt | ⬜ |
| E8 | janma_ready push on birth save | ⬜ |

## F. Robustness
| # | Flow | Status |
|---|------|--------|
| F1 | No JS console errors across all pages (logcat/CDP) | ⬜ |
| F2 | No 4xx/5xx network errors in app traffic | ⬜ |
| F3 | Offline/weak-network graceful degradation | ⬜ |


## Session results (verified on Redmi Note 13 5G)

- D1 booking: "Sankalpa Accepted · PRT-29485A83" — full modal flow on device
- D3 admin publish: "Device E2E Test Puja" created via CMS drawer ON THE
  PHONE → status=published → live on /pujas → publish-trigger broadcast
  delivered to the SAME device ("New puja offering available" in shade)
- E3/E5: heads-up banner captured; notification tap → app opened /profile
- E4: pushed:2 while foregrounded (mirroring path live)
- C5: theme switch Light→System→Dark verified (bg rgb changes)
- C3/C4: phone + birth fields persist in DB after real saves
- R5: profile tab rail scrolls on touch (scrollLeft 0→143)
- F1/F2: zero console errors, zero 4xx during sweep

## Issues found on device
- I-A1 (minor): MIUI AppLock intercepts app launch → first open shows unlock.
  Not our bug, but affects first-launch UX for locked users. No fix needed.
- I-A2 (minor): `location.reload()` inside Capacitor killed the app (exit to
  launcher). Not a user-facing path — no fix, noted.
- I-A3 (done): exact-alarm settings prompt on first local-notification
  schedule — FIXED via manifest strip.
