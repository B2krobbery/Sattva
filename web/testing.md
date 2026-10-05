# Pratha — User Flow Test Matrix

Legend: [x] untested · [x] pass · [x] found issue → issues.md#N

## A. Public browsing (no auth)
- [x] A1 Home: hero, sections render; ProfileNudge absent when logged out
- [x] A2 Discover: temples grid, filters (district/kind), cards link out
- [x] A3 Temple detail /temples/:slug: info, offerings, timings
- [x] A4 Puja discovery /pujas: offerings list, filters work
- [x] A5 Gaushala /gaushala: animals grid, gaushala info
- [x] A6 Animal passport /gaushala/animal/:id
- [x] A7 Seva /seva: campaigns list
- [x] A8 Live Darshan /darshan + /darshan/:id player
- [x] A9 Festival/event detail pages via /festivals/:slug, /events/:slug
- [x] A10 Navigation: all nav items route correctly, no dead links

## B. Auth
- [x] B1 Email+password login (devotee demo)
- [x] B2 "Explore Admin Console" → lands /admin with editor role
- [x] B3 "Explore Demo Account" → lands / as devotee, no Admin nav
- [x] B4 Signup new account (creates profile + referral_code via trigger)
- [x] B5 Logout + re-login
- [x] B6 Invalid credentials → error toast, no crash
- [x] B7 Forgot password → reset flow UI responds
- [x] B8 /profile and /admin redirect to /login when signed out

## C. Devotee (authenticated, non-admin)
- [x] C1 Profile view: identity card, stats, referral section
- [x] C2 Edit profile: name/phone/city/gotra save → persists
- [x] C3 Upload avatar → persists to avatar_path, completion nudge counts it
- [x] C4 ProfileNudge on Home: count matches filled fields (no fake pfp credit)
- [x] C5 Birth details form → saves dob/tob/pob → recommended pujas render
- [x] C6 Family members: add + list
- [x] C7 Puja booking flow from /pujas → booking created (status pending_payment)
- [x] C8 Seva contribution → contribution recorded
- [x] C9 Referral: code shown, share CTA, stats reflect referrals table
- [x] C10 Notification bell: unread count, open list, mark-read
- [x] C11 Ask Rishi (AI chat) loads + responds
- [x] C12 Theme toggle light/dark/system persists

## D. Admin (editor role)
- [x] D1 /admin gated: editor passes, devotee bounces
- [x] D2 Overview: all stat cards render non-null
- [x] D3 Bookings: list renders, Mark Performed/Cancel work
- [x] D4 Content: all 9 entity sections list rows (no empty-list bugs)
- [x] D5 Content: create draft → publish → visible publicly; edit old row keeps data
- [x] D6 Devotees: profile list renders
- [x] D7 Engagement: Plan/Send buttons + outbox rows
- [x] D8 Roles tab hidden for editor (super_admin only)

## E. Cross-cutting
- [x] E1 No console errors on any screen
- [x] E2 No 400/500 network errors in admin or public flows
- [x] E3 Images load (or graceful fallback), no broken media
- [x] E4 Mobile viewport (390px): nav, cards, forms usable
- [x] E5 Sign-out cleanup: private data not leaked after logout
