"use client";

import { useSyncExternalStore } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseServices } from "./client";
import { isFirebaseEnabled } from "./config";

export interface FirebaseAuthState {
  user: User | null;
  /** True until the first onAuthStateChanged callback fires (or immediately false if Firebase is disabled). */
  initializing: boolean;
}

const INITIAL_STATE: FirebaseAuthState = { user: null, initializing: true };
const DISABLED_STATE: FirebaseAuthState = { user: null, initializing: false };

let state: FirebaseAuthState = INITIAL_STATE;
const listeners = new Set<() => void>();
let subscribedOnce = false;

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Subscribes to Firebase's own onAuthStateChanged exactly once for the whole
 * app (module-level, not per-hook-instance) — matches the useLocalStorage
 * pattern in use-local-storage.ts of a single external store shared via
 * useSyncExternalStore, avoiding a setState-in-effect.
 */
function ensureSubscribed() {
  if (subscribedOnce) return;
  subscribedOnce = true;
  const services = getFirebaseServices();
  if (!services) {
    state = DISABLED_STATE;
    return;
  }
  onAuthStateChanged(services.auth, (user) => {
    state = { user, initializing: false };
    notify();
  });
}

function subscribe(callback: () => void): () => void {
  ensureSubscribed();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): FirebaseAuthState {
  ensureSubscribed();
  return state;
}

function getServerSnapshot(): FirebaseAuthState {
  return INITIAL_STATE;
}

/** Client-side hook exposing the current Firebase Auth user (or null in guest/disabled mode). */
export function useFirebaseAuth(): FirebaseAuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useFirebaseEnabled(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => isFirebaseEnabled(),
    () => false,
  );
}
