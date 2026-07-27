"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { resolveFirebaseConfig } from "./config";

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
    cached = { app, auth, db, googleProvider };
    return cached;
  } catch (error) {
    console.error("[firebase] Failed to initialise Firebase client:", error);
    cached = null;
    return undefined;
  }
}
