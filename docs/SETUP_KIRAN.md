# Setup checklist — Firebase + deploy (for Kiran)

The app works end-to-end **without** any of this (in-browser dataset). Do these steps only when you want the Firestore mirror and/or the public Pages URL.

## A. Firebase project (~10 minutes, free Spark plan)

1. Go to <https://console.firebase.google.com> → **Add project** → name it `signaalbrug-demo`. Disable Google Analytics (not needed).
2. In the project: **Build → Firestore Database → Create database** → Start in *production mode* → region `eur3 (europe-west)`.
3. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
4. **Project Overview → Web app (`</>` icon) → Register app** (nickname `signaalbrug-v2`, no hosting). Copy the `firebaseConfig` object it shows.
5. Publish the security rules: **Firestore → Rules** → paste the contents of [`firestore.rules`](../firestore.rules) → Publish.

## B. Connect the app

Pick one:

- **Runtime (fastest):** run the app → sign in as Admin → gear icon (settings drawer) → paste the `firebaseConfig` as JSON → **Connect Firebase**. The dataset now mirrors to Firestore on every change; "Pull from Firestore" restores it on another device.
- **Build time:** copy `.env.example` to `.env`, fill in the `VITE_FIREBASE_*` values from step A4, restart `npm run dev`. The mirror auto-connects.

The config values are not secret — the rules are the protection.

## C. GitHub Pages deploy

1. Create a **public** GitHub repo named `signaalbrug-v2` and push this folder to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`. Your URL: `https://<username>.github.io/signaalbrug-v2/`.
4. After the first deploy, open the URL on your phone and scan the QR codes on the home screen — they point at the live URL automatically.
5. If you connected Firebase: **Firebase console → Authentication → Settings → Authorized domains → Add** `<username>.github.io`.

## D. Demo-day checklist

- [ ] Open the deployed URL → home screen loads in < 3 s on 4G.
- [ ] "Reset demo" in the footer → fresh seed (timestamps look recent).
- [ ] Phone scan of staff QR → login screen; PIN `1234` works.
- [ ] Portal: Arabic → Asylum seeker → Housing answers differ from the Ukraine flow.
- [ ] Admin inbox shows all six channel badges in one stream.
