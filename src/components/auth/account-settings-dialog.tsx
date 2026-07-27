"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  changePassword,
  deleteFirebaseAccount,
  resendEmailVerification,
  sendPasswordReset,
  signOutUser,
} from "@/lib/firebase/auth-actions";
import { deleteAllUserData, exportAllUserData } from "@/lib/firebase/firestore-data";
import { useFirebaseAuth } from "@/lib/firebase/use-firebase-auth";

export function AccountSettingsDialog({
  onClose,
  onSignedOut,
}: {
  onClose: () => void;
  onSignedOut: () => void;
}) {
  const { user } = useFirebaseAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!user) return null;

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      await fn();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        className="border-border bg-surface relative w-full max-w-md rounded-xl border p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Account settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-accent-soft rounded-full p-1.5"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">{user.email}</p>
            <p className="text-muted-foreground text-xs">
              Email {user.emailVerified ? "verified" : "not verified"}.{" "}
              {!user.emailVerified && (
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() =>
                    withBusy(async () => {
                      await resendEmailVerification();
                      setStatus("Verification email sent.");
                    })
                  }
                >
                  Resend verification email
                </button>
              )}
            </p>
          </div>

          <div className="border-border-strong space-y-2 rounded-lg border p-3">
            <p className="font-medium">Change password</p>
            <label htmlFor="current-password" className="sr-only">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
            <label htmlFor="new-password" className="sr-only">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !currentPassword || newPassword.length < 6}
              onClick={() =>
                withBusy(async () => {
                  await changePassword(currentPassword, newPassword);
                  setCurrentPassword("");
                  setNewPassword("");
                  setStatus("Password updated.");
                })
              }
              className="border-border-strong w-full rounded-full border py-2 text-sm font-medium disabled:opacity-50"
            >
              Update password
            </button>
            <button
              type="button"
              disabled={busy || !user.email}
              onClick={() =>
                withBusy(async () => {
                  await sendPasswordReset(user.email!);
                  setStatus("Password reset email sent.");
                })
              }
              className="text-accent text-xs underline"
            >
              Or send a password reset email instead
            </button>
          </div>

          <div className="border-border-strong space-y-2 rounded-lg border p-3">
            <p className="font-medium">Your data</p>
            <p className="text-muted-foreground text-xs">
              Export everything stored for your account (papers, saved plans, favourites,
              preferences) as a JSON file, or delete it.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  withBusy(async () => {
                    const bundle = await exportAllUserData(user.uid);
                    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "my-account-data.json";
                    link.click();
                    URL.revokeObjectURL(url);
                  })
                }
                className="border-border-strong rounded-full border px-3 py-1.5 text-xs font-medium"
              >
                Export data as JSON
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  withBusy(async () => {
                    await deleteAllUserData(user.uid);
                    setStatus("All cloud data deleted. Your account itself is still active.");
                  })
                }
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:text-red-300"
              >
                Delete all cloud data
              </button>
            </div>
          </div>

          {status && (
            <p role="status" className="text-emerald-700 dark:text-emerald-300">
              {status}
            </p>
          )}
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <button
              type="button"
              onClick={() =>
                withBusy(async () => {
                  await signOutUser();
                  onSignedOut();
                })
              }
              className="border-border-strong rounded-full border px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-xs font-medium text-red-700 underline dark:text-red-300"
              >
                Delete account
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs">Delete account and all its data permanently?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    withBusy(async () => {
                      await deleteAllUserData(user.uid);
                      await deleteFirebaseAccount();
                      onSignedOut();
                    })
                  }
                  className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="border-border-strong rounded-full border px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
