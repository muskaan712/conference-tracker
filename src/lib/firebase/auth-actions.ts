"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  type User,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
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

export async function signInWithGoogle(): Promise<User> {
  const { auth, googleProvider } = requireAuth();
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
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

/**
 * Deletes the Firebase Auth account itself. Callers must delete the user's
 * Firestore documents *before* calling this (see firestore-data.ts
 * deleteAllUserData) — once the auth account is gone, security rules would
 * reject any further delete request as unauthenticated.
 */
export async function deleteFirebaseAccount(currentPassword?: string): Promise<void> {
  const { auth } = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in user.");
  if (currentPassword && user.email) {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }
  await deleteUser(user);
}
