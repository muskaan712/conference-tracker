"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  type User,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
} from "firebase/auth";
import { getFirebaseServices } from "./client";

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_ENABLED and the required config values.",
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

function requireAuth() {
  const services = getFirebaseServices();
  if (!services) throw new FirebaseNotConfiguredError();
  return services;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const { auth } = requireAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await firebaseSendEmailVerification(credential.user);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { auth } = requireAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export type GoogleSignInOutcome = { status: "signed-in"; user: User } | { status: "redirecting" };

/**
 * Popup-first, redirect-fallback Google sign-in. A popup keeps the app's own
 * page alive (simplest to reason about, and works fine even on most mobile
 * browsers), so it's tried first; a full-page redirect is only used when the
 * popup itself couldn't be shown at all (blocked, or the environment doesn't
 * support popups — e.g. some in-app/webview browsers). When redirecting, the
 * page navigates away immediately — the eventual result is picked up by
 * `getRedirectResult()` in use-firebase-auth.ts on the next load, not by this
 * call returning.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  const { auth, googleProvider } = requireAuth();
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return { status: "signed-in", user: credential.user };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return { status: "redirecting" };
    }
    throw error;
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { auth } = requireAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function resendEmailVerification(): Promise<void> {
  const { auth } = requireAuth();
  if (!auth.currentUser) throw new Error("No signed-in user.");
  await firebaseSendEmailVerification(auth.currentUser);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { auth } = requireAuth();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No signed-in email/password user.");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function signOutUser(): Promise<void> {
  const { auth } = requireAuth();
  await signOut(auth);
}

/** True if the signed-in user has an email/password credential attached (not just Google). */
export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

/** True if the signed-in user has a Google credential attached. */
export function hasGoogleProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "google.com");
}

/**
 * Re-authenticates the current user via whichever provider they actually
 * have, so a stale session doesn't block a sensitive action (password
 * change, account deletion) with `auth/requires-recent-login`. Google-only
 * accounts reauthenticate through a fresh Google popup; email/password
 * accounts need the caller to supply the current password.
 */
export async function reauthenticate(currentPassword?: string): Promise<void> {
  const { auth, googleProvider } = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  if (hasGoogleProvider(user)) {
    await reauthenticateWithPopup(user, googleProvider);
    return;
  }
  if (hasPasswordProvider(user) && user.email && currentPassword) {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return;
  }
  throw new Error("Unable to re-authenticate: no supported provider or password supplied.");
}

/**
 * Deletes the Firebase Auth account itself. Callers must delete the user's
 * Firestore documents *before* calling this (see firestore-data.ts
 * deleteAllUserData) — once the auth account is gone, security rules would
 * reject any further delete request as unauthenticated. If the session is
 * too old, Firebase rejects this with `auth/requires-recent-login`; callers
 * should catch that, call `reauthenticate()`, then retry.
 */
export async function deleteFirebaseAccount(): Promise<void> {
  const { auth } = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  await deleteUser(user);
}
