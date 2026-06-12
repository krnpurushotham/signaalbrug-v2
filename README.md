# SignaalBrug v2 — Refugee Help Case Console

> **Demo only — no real client data.** Concept for RefugeeHelp / VluchtelingenWerk Nederland (Legal Tech Challenge 2026, Team LexPulse).

Six intake channels — web form, walk-in, phone, email, voice note, appointment request — consolidated into a single case console, with skills-based volunteer assignment, a tailored refugee self-service portal, and a content-improvement feedback loop.

## The three faces

| Face | Route | What it does |
|---|---|---|
| **Home / role picker** | `#/` | QR codes for staff + portal, EN/NL language selector, staff login (Volunteer/Admin tiles → PIN `1234` or simulated Google verification), public portal entry |
| **Refugee portal** | `#/portal` | No login: language → situation onboarding, tailored FAQ + videos, support / appointment / callback forms, case tracking, "Find help near you" map, token-gated QR receipts |
| **Staff console** | `#/staff/*` | Add New Entry → Inbox → Triage Board → Queue/Assignments → Map → Content Insights* → User Management* → Site Config* → Analytics (*admin-only) |

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it — the app runs fully on an in-browser dataset (localStorage, seeded with relative timestamps so the demo always looks fresh). **Reset demo** on the home-page footer (or in the staff settings drawer) reseeds in ~1 second.

- Staff demo PIN: **1234**
- "Continue with Google" is simulated — production wires real Google Sign-In behind a flag.

## Firebase (optional)

The data layer is local-first with an optional Firestore mirror:

1. **Runtime:** staff settings drawer (gear icon in the sidebar) → paste your Firebase web config JSON → Connect.
2. **Build time:** copy `.env.example` to `.env` and fill the `VITE_FIREBASE_*` keys — the mirror auto-connects on load.

Setup checklist for the Firebase project: [docs/SETUP_KIRAN.md](docs/SETUP_KIRAN.md). Demo-grade security rules: [firestore.rules](firestore.rules).

## Deployment (GitHub Pages)

Push to `main` in a repo named `signaalbrug-v2` — [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds with `base: '/signaalbrug-v2/'` and deploys to Pages. Hash routing avoids 404s; the map uses circle markers so no Leaflet icon assets 404 on the Pages base path.

The QR codes on the home screen are generated at runtime from the page URL, so they automatically point at the deployed URL — scan with a phone to follow a demo live. A PWA manifest enables "Add to Home Screen".

## Architecture

```
src/
  main.jsx            root hash router + admin route guards
  styles.css          design tokens (oklch, "Resilient Sanctuary") + all component styles
  lib/
    store.js          localStorage store (pub/sub + version counter), domain logic,
                      WebCrypto demo encryption, optional Firestore mirror, formatters
    translations.js   EN/NL strings for home + verification (t / getLanguage / setLanguage)
    anim.js           WAAPI entrance choreography (base state always visible)
  ai/adapter.js       deterministic mock AiAdapter (translate/classify/scoreUrgency/
                      draftPlan/parseUnstructured/draftFaq/similarity); gemini/anthropic stubs
  data/seed.js        seed dataset — 7 staff, 10 cases over 6 channels, 17 FAQs,
                      6 video resources, 8 map locations, 30 days of volume
  components/         Icon, Modal, Field, SegControl, chips, toast, Brand, QRBox, hooks
  screens/            Home, Portal, Staff (shell/add/inbox), Triage (board/case/queue),
                      Insights (map/insights/analytics), Admin (users/config/CSV export)
```

**Re-render contract:** the store mutates `db` in place, so `useDb()` subscribes `useSyncExternalStore` to a version counter (`SBStore.version`) rather than the object reference — otherwise React bails out on identical snapshots and toggles appear dead.

**Key domain logic** (in `src/lib/store.js`):
- `rankVolunteers` — score = skill match ×3 + language match ×2 − open-case load (−5 when away); the breakdown is displayed in the assignment modal — suggestion ≠ decision.
- `duplicateOf` — same phone/email within 7 days OR Jaccard text similarity > 0.8 → "possible duplicate" banner with one-click merge.
- `encryptCase`/`decryptCase` — AES-256-CBC via WebCrypto, key = SHA-256 of a 6-char token. **Demo cryptography, not audited.**

## Demo shortcuts that need real implementations

1. Hardcoded PIN `1234` + simulated Google verification → real auth.
2. localStorage store (with snapshot mirror) → Firestore per-collection reads/writes + anonymous auth.
3. Mock AiAdapter → live provider via `VITE_AI_PROVIDER=gemini|anthropic` + API key.
4. CSV export is client-side (fine to keep; consider server-side for large histories).
5. Full EN/NL/AR UI translation with RTL mirroring (structure is ready; RTL detection on case text already works).

## Design system

"Resilient Sanctuary" — deep forest greens (`oklch`), cool paper neutrals, **no 1px borders** (depth via background shifts + layered shadows), Bricolage Grotesque / Instrument Sans / Spline Sans Mono, 44×44 touch targets, WAAPI entrance reveals layered over visible base states. All tokens in `src/styles.css` `:root`.
