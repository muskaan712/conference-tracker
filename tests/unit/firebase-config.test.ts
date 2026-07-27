import { afterEach, describe, expect, it } from "vitest";
import { resolveFirebaseConfig, isFirebaseEnabled } from "@/lib/firebase/config";

const FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_ENABLED",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

function clearFirebaseEnv() {
  for (const key of FIREBASE_ENV_KEYS) delete process.env[key];
}

const COMPLETE_CONFIG: Record<(typeof FIREBASE_ENV_KEYS)[number], string> = {
  NEXT_PUBLIC_FIREBASE_ENABLED: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "example-project",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "example.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef",
};

describe("resolveFirebaseConfig", () => {
  afterEach(() => {
    clearFirebaseEnv();
  });

  it("is disabled when no env vars are set at all (guest-mode default)", () => {
    clearFirebaseEnv();
    const resolved = resolveFirebaseConfig();
    expect(resolved.enabled).toBe(false);
    expect(resolved.config).toBeUndefined();
    expect(isFirebaseEnabled()).toBe(false);
  });

  it("is disabled when NEXT_PUBLIC_FIREBASE_ENABLED is not exactly 'true'", () => {
    Object.assign(process.env, COMPLETE_CONFIG, { NEXT_PUBLIC_FIREBASE_ENABLED: "yes" });
    expect(resolveFirebaseConfig().enabled).toBe(false);
  });

  it("is disabled when enabled but missing a required config value", () => {
    Object.assign(process.env, COMPLETE_CONFIG, { NEXT_PUBLIC_FIREBASE_API_KEY: "" });
    expect(resolveFirebaseConfig().enabled).toBe(false);
  });

  it("is enabled only when NEXT_PUBLIC_FIREBASE_ENABLED='true' AND every value is present", () => {
    Object.assign(process.env, COMPLETE_CONFIG);
    const resolved = resolveFirebaseConfig();
    expect(resolved.enabled).toBe(true);
    expect(resolved.config).toEqual({
      apiKey: "api-key",
      authDomain: "example.firebaseapp.com",
      projectId: "example-project",
      storageBucket: "example.appspot.com",
      messagingSenderId: "123456",
      appId: "1:123456:web:abcdef",
    });
    expect(isFirebaseEnabled()).toBe(true);
  });
});
