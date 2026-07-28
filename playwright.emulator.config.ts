import { defineConfig, devices } from "@playwright/test";

/**
 * A separate, opt-in Playwright config for the one scenario that needs a
 * *real* (emulated) sign-in and a real Firestore round-trip: proving a
 * paper saved without a `currentTarget` actually reaches the cloud instead
 * of hitting "Unsupported field value: undefined". The main
 * playwright.config.ts's `chromium-firebase-enabled` project deliberately
 * never signs in for real (see its own doc comment) — dialog chrome only —
 * so it can't exercise an actual Firestore write.
 *
 * Requires the Firebase Auth + Firestore emulators (see firebase.json),
 * which in turn require a local Java runtime. Run via:
 *
 *   npm run test:e2e:emulator
 *
 * which wraps this in `firebase emulators:exec` (see package.json) — not
 * part of the default `npm run test:e2e` / `npm test`, exactly like
 * `test:rules` is kept separate from the default `vitest run`.
 */
const EMULATOR_ENV = {
  NEXT_PUBLIC_FIREBASE_ENABLED: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-conference-tracker.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-conference-tracker",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-conference-tracker.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
};

export default defineConfig({
  testDir: "./tests/e2e-emulator",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3200",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-firebase-emulator",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev -p 3200",
    url: "http://localhost:3200",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3200", ...EMULATOR_ENV },
  },
});
