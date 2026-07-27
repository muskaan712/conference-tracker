# Firebase setup (optional)

Firebase is entirely optional. Skip this document if you're happy with the
public tracker and guest-only (local-browser) My Papers / planner — nothing
else in the app requires it, and it builds and runs correctly with zero
Firebase configuration.

This document is a checklist of manual steps in the Firebase Console. No
Firebase project was created and no credentials were supplied as part of
this change — this is a guide for you to do it yourself.

## What Firebase adds

- Optional user accounts (email/password + Google sign-in)
- Cross-device sync for My Papers and saved resubmission plans, for
  signed-in users only
- Nothing else — the conference/event dataset itself stays static JSON in
  the repo, never in Firestore

## 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and
   click **Add project**.
2. Name it anything (e.g. `ai-conference-tracker`).
3. Google Analytics is not required — you can disable it.
4. Stay on the **Spark (free, no-cost)** plan. Nothing in this codebase
   requires Blaze/billing — see "Free-tier limitations" below.

## 2. Register a Web app

1. In the project overview, click the **`</>`** (Web) icon → **Register app**.
2. Give it any nickname. Firebase Hosting is not needed — skip it.
3. Copy the `firebaseConfig` object shown — you'll need `apiKey`,
   `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

## 3. Enable Email/Password authentication

1. **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 4. Enable Google authentication

1. Same **Sign-in method** tab → enable **Google**.
2. Set a support email (required by Google's consent screen).

## 5. Create a Firestore database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** (not test mode — this repo's `firestore.rules`
   defines the real security rules; test mode's `allow read, write: if true`
   is exactly what this project's rules deliberately avoid).
3. Pick any region close to your users.

## 6. Deploy `firestore.rules`

The rules live at the repo root ([`firestore.rules`](../firestore.rules)).
Deploy them with the Firebase CLI:

```bash
npm install -g firebase-tools   # one-time, if you don't have it
firebase login
firebase init firestore         # point it at this repo, select your project
firebase deploy --only firestore:rules
```

Or paste the file's contents directly into **Firestore → Rules** in the
Console and click **Publish**.

## 7. Add your Vercel domain to authorised domains

**Authentication → Settings → Authorized domains** → add:

- `your-project.vercel.app` (and any custom domain)
- Preview deployments use a different subdomain per deploy; for Google
  sign-in to work on previews too, add `vercel.app` as a wildcard-adjacent
  entry isn't supported by Firebase — either test auth against the
  production domain only, or add specific preview URLs as needed.

`localhost` is authorised by default for local development.

Google sign-in uses a popup first (`signInWithPopup`), falling back to a
full-page redirect (`signInWithRedirect`) only if the popup itself can't be
shown (blocked, or an environment that doesn't support popups). If Google
sign-in fails, the UI now surfaces the real Firebase error code (in the
console, always, and via a specific message for common cases — see
`src/lib/firebase/auth-errors.ts`) instead of one generic message, so a
missing authorised domain or a disabled provider is diagnosable from the
error text itself rather than requiring a source dive.

## 8. Configure environment variables

**Local development** — copy the values from step 2 into `.env.local`
(never commit this file):

```env
NEXT_PUBLIC_FIREBASE_ENABLED=true
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Vercel** — Project → Settings → Environment Variables → add the same six
`NEXT_PUBLIC_FIREBASE_*` variables (Production, and Preview if you want
Firebase enabled on preview deployments too) → redeploy.

Leaving `NEXT_PUBLIC_FIREBASE_ENABLED` unset or `false` (or omitting any of
the other five) keeps the app in guest-only mode — the build still succeeds,
and sign-in controls simply don't render (see
`resolveFirebaseConfig()`/`isFirebaseEnabled()` in
[`src/lib/firebase/config.ts`](../src/lib/firebase/config.ts)).

## 9. Run the Firestore emulator (for rules tests / local dev)

```bash
npm install -g firebase-tools   # if not already installed
firebase emulators:start --only firestore,auth
```

The emulator requires a Java runtime (the Firestore emulator is a JVM
process) — install a JDK if `firebase emulators:start` complains about a
missing Java installation.

`tests/firestore/rules.test.ts` uses `@firebase/rules-unit-testing` against
this emulator. Run it with:

```bash
npm run test:rules
```

This requires the emulator running (or `firebase emulators:exec` to start
it, run the tests, then tear it down automatically) — it is **not** part of
the default `npm test` run, and does not require live production Firebase
credentials.

## 10. Export and delete user data

Already implemented in the app itself (Account settings dialog):

- **Export**: downloads a JSON file of everything stored for the signed-in
  user (papers, saved plans, favourites, preferences).
- **Delete cloud data**: deletes those same Firestore documents.
- **Delete account**: deletes the Firestore documents, then the Firebase
  Auth account itself.

This is a **client-side** enumeration of the app's own known collections,
not a generic recursive delete — see the doc-comment on `deleteAllUserData`
in [`src/lib/firebase/firestore-data.ts`](../src/lib/firebase/firestore-data.ts).
A true server-side recursive delete would need a Cloud Function, which
requires the Blaze (pay-as-you-go) plan — deliberately out of scope to keep
this project on the free Spark plan.

## 11. Disabling Firebase later

Set `NEXT_PUBLIC_FIREBASE_ENABLED=false` (or remove the variable) and
redeploy. Sign-in controls disappear, guest mode is unaffected, and any data
already in Firestore is untouched (just inaccessible from the UI until you
re-enable it).

## Free-tier (Spark plan) limitations

- Firestore Spark quota: 50K reads/day, 20K writes/day, 20K deletes/day, 1
  GiB stored — ample for a personal project, but not unlimited, and Google
  can change these limits at any time.
- No Cloud Functions, no Cloud Storage, no phone auth, no paid extensions
  are used anywhere in this codebase.
- The app does not enable Firebase billing (Blaze) automatically, and
  nothing in the code path requires it.

## App Check (optional, post-launch hardening)

[Firebase App Check](https://firebase.google.com/docs/app-check) can add
an extra layer of abuse protection (verifying requests come from your real
app, not a script). It is **not** configured in this codebase — treat it as
an optional hardening step to add later. Missing App Check configuration
does not break guest mode or anything else; App Check is additive.

## What this integration does NOT claim

- Firebase has **not** been configured with real project credentials in
  this repository — you must complete steps 1-8 yourself.
- Authentication has **not** been tested against a live production Firebase
  project in this change.
- Data is **not** end-to-end encrypted. Firestore encrypts data at rest and
  in transit (standard Google Cloud practice), but the app itself performs
  no additional client-side encryption, and Firebase/Google can access data
  per their own terms of service.
- No manuscript files are ever uploaded — only paper metadata (title,
  authors, stage, target venue, tasks, notes) is stored.
