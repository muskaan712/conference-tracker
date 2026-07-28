"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, connectAuthEmulator, getAuth } from "firebase/auth";
import { type Firestore, connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { resolveFirebaseConfig } from "./config";

/**
 * Test/local-dev only: when set (host:port, e.g. "127.0.0.1"), routes Auth
 * and Firestore at the matching ports in firebase.json to the local Firebase
 * emulator suite instead of real Google infrastructure. Never set in
 * production — see tests/e2e/firebase-enabled/papers-sync-emulator.spec.ts
 * and the `test:e2e:emulator` script, which are the only intended callers.
 */
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;

/**
 * Lazy, client-only Firebase singleton. Never initialises during SSR/build,
 * and never initialises at all unless resolveFirebaseConfig() says Firebase
 * is enabled with complete configuration — see config.ts. Every consumer
 * must call getFirebaseServices() and handle an `undefined` result (Firebase
 * disabled) rather than assume it always succeeds.
 */
interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

let cached: FirebaseServices | null | undefined;

export function getFirebaseServices(): FirebaseServices | undefined {
  if (typeof window === "undefined") return undefined;
  if (cached !== undefined) return cached ?? undefined;

  const resolved = resolveFirebaseConfig();
  if (!resolved.enabled || !resolved.config) {
    cached = null;
    return undefined;
  }

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(resolved.config);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const googleProvider = new GoogleAuthProvider();
    if (EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    }
    cached = { app, auth, db, googleProvider };
    return cached;
  } catch (error) {
    console.error("[firebase] Failed to initialise Firebase client:", error);
    cached = null;
    return undefined;
  }
}
