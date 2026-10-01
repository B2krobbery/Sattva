# Pratha (प्रथा)

> **A spiritual platform connecting devotees with temples, pujas, Gaushala welfare, and AI-guided Vedic assistance.**

**Live web app:** https://pratha-two.vercel.app
**Android APK:** [Releases](https://github.com/marvelpokemaster/Pratha/releases) (debug-signed builds for sideloading)

Built with **React 19 + Vite + Tailwind 4**, shipped to **Android via Capacitor**, **iOS via an Expo DOM bridge**, and **the web via Vercel**. Backend is **hosted Supabase** (Auth, Postgres + RLS, RPCs, Edge Functions).

---

## 🌟 Key Features

* 🛕 **Temple, Puja & Festival Discovery**: Public catalog of temples, pujas, festivals and live darshan streams.
* 📿 **Puja Booking**: Slot selection, attendee/family members, and server-validated bookings (`confirmed`/`pending_payment`) via Postgres RPCs.
* 🪷 **Gau Seva & Welfare**: Sponsor fodder, medical care, and shelter for rescued cattle; transparent contribution records.
* 🤖 **Rishi Vedic AI**: Gemini 2.5 Flash assistant served through a JWT-protected Supabase Edge Function (`rishi-ask`), with the legacy Cloudflare Worker as fallback.
* 🔐 **Auth**: Email/password (confirmation + reset via custom SMTP) and Google OAuth — Custom Tab + `pratha://` deep link on Android.
* 🌗 **Themes**: Light / Dark / System appearance, safe-area aware on Android 15+ edge-to-edge.
* � **Profile**: Seva history, puja bookings, Sankalpa family management.

---

## 🏗️ Architecture

```text
React DOM app (web/src) ──► Vite build (web/dist)
    ├──► Vercel            — pratha-two.vercel.app (auto-deploys on push to main)
    ├──► Capacitor Android — web/android wraps dist, deep link pratha://auth/callback
    └──► Expo DOM bridge   — expo/src/PrathaDomBridge.tsx renders the same web app

Supabase project yxwwgynxgihrktwndhep (ap-south-1)
    ├── Postgres + RLS (all reads public-safe, writes via authenticated RPCs)
    ├── Auth: email/password + Google OAuth
    ├── Edge Function: rishi-ask (Gemini, JWT-gated, key in Supabase Vault)
    └── Legacy fallback: Cloudflare Worker utsavam-backend (backend/)
```

## 📁 Repository Structure

```text
.
├── web/                 # React 19 + Vite + Tailwind 4 app (source of truth for UI)
│   ├── src/features/    # auth, home, discover, pujas, gaushala, seva, profile, ai
│   ├── src/lib/api/     # Supabase data layer
│   ├── android/         # Capacitor Android project (generated — do not hand-edit)
│   └── vercel.json      # SPA rewrites + asset caching
├── expo/                # Expo SDK 57 DOM bridge for iOS
├── supabase/
│   ├── migrations/      # Schema history (001–013)
│   └── functions/       # rishi-ask (Gemini), sattva-api (legacy scaffold)
├── backend/             # Legacy Cloudflare Worker (Firestore/Firebase-era fallback)
└── docs/AGENT_HANDOFF.md # Canonical engineering state — read before changing anything
```

## 🚀 Getting Started

### Web (dev)

```bash
cd web && npm install && npm run dev   # http://localhost:5173
```

### Web (checks)

```bash
cd web && npx tsc -b && npm run lint && npm run build
```

### Android

```bash
cd web && npx cap sync android
cd web/android && ANDROID_HOME=~/Android/Sdk ./gradlew assembleDebug
# APK: web/android/app/build/outputs/apk/debug/app-debug.apk
```

Or download the debug APK from [Releases](https://github.com/marvelpokemaster/Pratha/releases). Play Store submission needs a release-signed AAB — the published builds are debug-signed.

### iOS (Expo DOM bridge)

```bash
cd expo && npm install && npx expo start
```

### Hosted Supabase E2E

```bash
cd web && node scripts/e2e-hosted.mjs   # needs a confirmed test account via env vars
```

## 🔐 Auth & Secrets

- Supabase Auth is the single auth provider — RLS policies depend on `auth.uid()`. Do not swap in Firebase tokens.
- Redirect URLs must include the web origin, `pratha://auth/callback` (Android), and the iOS/Expo scheme.
- Secrets (Gemini, Resend) live in Supabase Vault — never in this repo.

## 📖 Docs

- `docs/AGENT_HANDOFF.md` — canonical state, validation history, remaining blockers.
- `backend/API.md` — legacy Worker endpoints (Firebase-token auth; superseded by Supabase).

## 🔒 Security

- All table access is RLS-governed; writes go through authenticated RPCs.
- `rishi-ask` rejects anonymous calls at the gateway (`verify_jwt`) and inside the function.
- Security-definer helpers exist by design for policy evaluation — see the handoff doc before revoking grants.
