"use client";

import { useState } from "react";
import Link from "next/link";
import {
  changePassword,
  deleteFirebaseAccount,
  hasGoogleProvider,
  hasPasswordProvider,
  reauthenticate,
  resendEmailVerification,
  sendPasswordReset,
  signOutUser,
} from "@/lib/firebase/auth-actions";
import { describeAuthError } from "@/lib/firebase/auth-errors";
import { deleteAllUserData, exportAllUserData } from "@/lib/firebase/firestore-data";
import { useFirebaseAuth } from "@/lib/firebase/use-firebase-auth";
import { Dialog } from "@/components/dialog";

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
  const [deleteReauthPassword, setDeleteReauthPassword] = useState("");
  const [needsReauthForDelete, setNeedsReauthForDelete] = useState(false);

  if (!user) return null;

  const canChangePassword = hasPasswordProvider(user);
  const signedInWithGoogle = hasGoogleProvider(user);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(describeAuthError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(reauthPassword?: string) {
    if (!user) return;
    try {
      if (reauthPassword || signedInWithGoogle) {
        await reauthenticate(reauthPassword);
      }
      await deleteAllUserData(user.uid);
      await deleteFirebaseAccount();
      onSignedOut();
    } catch (err) {
      const info = describeAuthError(err);
      if (info.code === "auth/requires-recent-login") {
        setNeedsReauthForDelete(true);
        setError(
          signedInWithGoogle
            ? "For your security, please confirm with Google again."
            : "For your security, please re-enter your current password."
        );
        return;
      }
      throw err;
    }
  }

  return (
    <Dialog onClose={onClose} title="Account settings" className="max-w-md">
      <div className="space-y-4 text-sm">
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-muted-foreground text-xs">
            {signedInWithGoogle ? "Signed in with Google. " : null}
            {canChangePassword && (
              <>
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
              </>
            )}
          </p>
        </div>

        {canChangePassword ? (
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
        ) : (
          <p className="border-border-strong text-muted-foreground rounded-lg border p-3 text-xs">
            You signed in with Google, so there&apos;s no separate password to manage here.
          </p>
        )}

        <div className="border-border-strong space-y-2 rounded-lg border p-3">
          <p className="font-medium">Your data</p>
          <p className="text-muted-foreground text-xs">
            Export everything stored for your account (papers, saved plans, favourites,
            preferences) as a JSON file, or delete it. See{" "}
            <Link href="/privacy" className="text-accent underline">
              what&apos;s stored and where
            </Link>
            .
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
          ) : needsReauthForDelete && !signedInWithGoogle ? (
            <div className="flex flex-col items-end gap-2">
              <label htmlFor="delete-reauth-password" className="sr-only">
                Confirm current password
              </label>
              <input
                id="delete-reauth-password"
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={deleteReauthPassword}
                onChange={(e) => setDeleteReauthPassword(e.target.value)}
                className="border-border-strong bg-surface w-48 rounded-md border px-3 py-1.5 text-xs"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !deleteReauthPassword}
                  onClick={() => withBusy(() => deleteAccount(deleteReauthPassword))}
                  className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setNeedsReauthForDelete(false);
                    setDeleteReauthPassword("");
                  }}
                  className="border-border-strong rounded-full border px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs">
                {needsReauthForDelete
                  ? "Confirm with Google to finish deleting your account."
                  : "Delete account and all its data permanently?"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => withBusy(() => deleteAccount())}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setNeedsReauthForDelete(false);
                }}
                className="border-border-strong rounded-full border px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
