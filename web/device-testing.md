# On-Device E2E Plan — v1.1.7 (Redmi Note 13 5G, Android 15)

Tooling: `mobile-mcp` (tap/swipe/screenshot) + `webview_devtools_remote` CDP
(`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`) for
WebView DOM, plus Supabase MCP for DB assertions.

## Regression — previously reported bugs ✅ ALL PASS
- [x] R1 Bell tap → notification panel renders fully on-screen (portal-to-body fix; screenshot-verified)
- [x] R2 Phone saves AND persists after a second save of another field
      (`+919000111222` persisted; subsequent birth save left it intact)
- [x] R3 Birth-details modal does not reappear after save; birth fields persist
      (migration 023 grants; DOB `1992-08-15` + TOB `07:45` in profiles)
- [x] R4 Push notification fires on birth-details save — "Your janma chart is
      ready ✨" row created at save time; heads-up banner verified visually
- [x] R5 Profile tab rail scrolls horizontally on touch (scrollLeft moved
      0 → 143 via real swipe after touch-action fix)

## Core user flows ✅ ALL PASS
- [x] F1 Home renders panchang + actions, no JS errors
- [x] F2 Discover lists content ("Utsav-Inspired Discovery")
- [x] F3 Pujas list renders (34 cards)
- [x] F4 Gaushala renders ("Meet the Rescued Herd")
- [x] F5 Seva page renders
- [x] F6 Profile page + all 5 tabs reachable (rail scrolls)
- [x] F7 Admin tab renders Sanctum Control with live metrics for admin

## Notification system ✅ ALL PASS
- [x] N1 POST_NOTIFICATIONS permission granted on device
- [x] N2 pratha_notifications channel: importance=4 (HIGH), heads-up capable
- [x] N3 FCM token rows in push_tokens (2 device tokens)
- [x] N4 Broadcast → heads-up banner captured on-device ("E2E Verify 🪔 · now")
- [x] N5 In-app bell shows same rows (7 unread badge, sheet renders)
- [x] N6 Foreground broadcast → `pushed:2, in_app:5` (mirroring path live)

## Extra finding (fixed)
- `updateProfile` partial-update field-wipe (birth save nulling `phone`) — fixed.
- Android "Alarms and reminders" settings screen appeared once after a
  LocalNotifications.schedule call — MIUI surfaced SCHEDULE_EXACT_ALARM flow;
  enabled during test. Worth noting: exact-alarm prompting is heavy for
  foreground mirroring; consider schedule() without exact flag (default is fine).
