"use client";

import { useSyncExternalStore } from "react";
import { getRedirectResult, onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseServices } from "./client";
import { isFirebaseEnabled } from "./config";
import { describeAuthError, type AuthErrorInfo } from "./auth-errors";

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

let redirectError: AuthErrorInfo | null = null;
const redirectErrorListeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function notifyRedirectError() {
  for (const listener of redirectErrorListeners) listener();
}

/** Dismisses a surfaced Google-redirect sign-in error once the user has seen it. */
export function clearGoogleRedirectError(): void {
  redirectError = null;
  notifyRedirectError();
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
  // A successful redirect sign-in is already picked up by onAuthStateChanged
  // below; this call exists to surface an *error* from a completed redirect
  // (e.g. auth/account-exists-with-different-credential), which otherwise
  // has nowhere to go since the page that started the redirect is gone.
  getRedirectResult(services.auth).catch((error) => {
    redirectError = describeAuthError(error);
    notifyRedirectError();
  });
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

function subscribeRedirectError(callback: () => void): () => void {
  ensureSubscribed();
  redirectErrorListeners.add(callback);
  return () => redirectErrorListeners.delete(callback);
}

/** Surfaces an error from a completed Google-redirect sign-in, if one occurred. */
export function useGoogleRedirectError(): AuthErrorInfo | null {
  return useSyncExternalStore(
    subscribeRedirectError,
    () => redirectError,
    () => null,
  );
}
