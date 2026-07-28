import { defineConfig, devices } from "@playwright/test";

/**
 * Well-formed but non-functional Firebase config — enough for
 * resolveFirebaseConfig()/getFirebaseServices() to turn Firebase "on" and
 * render the real sign-in UI (auth-modal, account menu, …), without ever
 * making a real network call. Specs under tests/e2e/firebase-enabled/ only
 * exercise dialog chrome (open/close/scroll/focus) — never an actual
 * sign-in — so no live Firebase project is required.
 */
const FAKE_FIREBASE_ENV = {
  NEXT_PUBLIC_FIREBASE_ENABLED: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-project.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-project.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /firebase-enabled\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-firebase-enabled",
      testMatch: /firebase-enabled\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100" },
    },
  ],
  webServer: [
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
    },
    {
      // A dev server (not a full production build) is enough for the
      // Firebase-enabled dialog-chrome specs, and starts far faster.
      command: "npx next dev -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3100", ...FAKE_FIREBASE_ENV },
    },
  ],
});
