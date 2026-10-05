# Pratha — QA Issues Log (senior review)

Severity: 🔴 blocker · 🟠 high · 🟡 medium · 🔵 low
Status: ✅ fixed-in-session · ⏳ open

## ✅ Fixed during this review (commit history covers them)

| # | Bug | Root cause | Fix |
|---|---|---|---|
| F1 | Admin Bookings + Engagement tabs empty | `devotee:profiles` embed — `puja_bookings.user_id`/`notification_outbox.user_id` FK to `auth.users`, not `profiles` → PostgREST 400 | `a4e53f4` — separate profiles `.in()` lookup |
| F2 | Offerings embed 400 | used `title_i18n`; column is `name_i18n` | `a4e53f4` |
| F3 | CMS edit blanked old rows + wiped `*_i18n` locales | editor loaded the list-row (4 cols) | `f348b3c` — full-row fetch on edit |
| F4 | i18n fields 400ed the edit fetch | `description`/`story`/`summary`/`body` aren't columns — only `*_i18n` exists | `f348b3c` |
| F5 | Darshan Streams list always empty | `live_streams` has **no `slug` column**; unconditional select 400ed | this commit — slug only in SLUG_TABLES that have it |
| F6 | Welfare Updates list always empty | table has **no `created_at`/`updated_at`** — orderCol now `published_at` | this commit |
| F7 | Cows list empty | same slug bug as F5 (animals has no slug) | `92e0e19` |
| F8 | /admin bounced freshly-signed-in admins | roles query disabled until `user` resolved → redirect fired early | `e5cbbd9` — wait for `roles !== undefined` |
| F9 | "Explore Admin Console" landed on `/` | post-login `useEffect` always navigates `/` | `e5cbbd9` — `sessionStorage.postLoginRedirect` |
| F10 | Generated columns written on insert | `name`/`title` are GENERATED — writes must target `*_i18n` only | `c1c17c1` |

## ⏳ Open issues for the junior's coding agent

### I1 🟠 PARTIALLY FIXED — emails 502 for real users (domain verification still needed)
- **Status change**: `notify-send` now writes an **in-app `notifications` row and an FCM push BEFORE attempting email**, then returns `200 {ok:true, email_error:…}` instead of a hard 502. Users are notified in-app/on-device regardless; the email leg still fails until a verified Resend domain replaces `namaste@resend.dev` (needs DNS access — not codeable).
- **Remaining fix**: verify a domain at resend.com/domains (needs DNS access), then change `FROM` in `supabase/functions/notify-send/index.ts` and redeploy.

### I2 ✅ FIXED — `ensure_referral_code` retries once after `getSession()` when the first post-login call 401s
- **Symptom**: one `401` on `rest/v1/rpc/ensure_referral_code` in the onboarding effect (`AuthContext.tsx:38-47`).
- **Why**: RPC fires the moment `onAuthStateChange` sets `user`, before the REST client reliably attaches the session token. Harmless (idempotent, code already exists) but ugly.
- **Fix**: in `ensureReferralCode`, retry once after `getSession()` if error code is 401, or await `supabase.auth.getSession()` before the rpc.

### I3 ✅ FIXED — breed chips are now dynamic + deduped from actual animal data (`[...new Set(breeds)]`); was misdiagnosed as dup chips (those were card badges) but the real defect was hardcoded Sahiwal/Gir-only filters — every breed now filters
- **Symptom**: "VECHUR" appears twice in the filter rail (two Vechur animals → options built per-animal, not deduped).
- **Fix**: dedupe the chip list in the GaushalaDiscovery filter builder (Set by breed value).

### I4 ✅ FIXED — info button is now a real `<Link>`; card onClick retained for touch
- **Symptom**: `/gaushala` cards use onClick nav — no middle-click/new-tab, worse a11y + shareability.
- **Fix**: wrap card in `<Link to={/gaushala/animal/${id}}>`.

### I5 🟡 Non-admin demo signup requires manual SQL email-confirm (documented, by-design for prod)
- **Symptom**: `pratha.demo.devotee` needed `update auth.users set email_confirmed_at` — new signups can't log in until confirmed (fine, intended), but demo onboarding docs should note it or turn confirm-email off for demo env.

### I6 🔵 Editorial Blocks CMS = raw JSON textarea (accepted — advanced feature)
- `payload_i18n` edited as raw JSON — footgun for non-technical admins. Acceptable as "advanced" for now.

## Known external blockers (not code bugs)
- FCM push delivery on real device: chain verified server-side; needs a physical device token to confirm end-to-end.
- Resend test-domain limits all outbound email to the account owner (see I1).
