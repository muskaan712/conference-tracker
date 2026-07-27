"use client";

import { useState } from "react";
import { CircleUserRound, X } from "lucide-react";
import {
  clearGoogleRedirectError,
  useFirebaseAuth,
  useFirebaseEnabled,
  useGoogleRedirectError,
} from "@/lib/firebase/use-firebase-auth";
import { signOutUser } from "@/lib/firebase/auth-actions";
import { resetPapersStoreSessionCache } from "@/lib/firebase/use-papers-store";
import { AuthModal } from "./auth-modal";
import { AccountSettingsDialog } from "./account-settings-dialog";

export function AccountMenu() {
  const firebaseEnabled = useFirebaseEnabled();
  const { user, initializing } = useFirebaseAuth();
  const redirectError = useGoogleRedirectError();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!firebaseEnabled) return null;
  if (initializing) return null;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="border-border-strong bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
          aria-label="Sign in"
        >
          <CircleUserRound aria-hidden className="h-4 w-4" />
          <span className="hidden lg:inline">Sign in</span>
        </button>
        {redirectError && (
          <div
            role="alert"
            className="absolute top-full right-4 z-30 mt-2 w-72 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 shadow-lg dark:border-red-800 dark:bg-red-950/60 dark:text-red-100"
          >
            <div className="flex items-start justify-between gap-2">
              <p>{redirectError.message}</p>
              <button
                type="button"
                onClick={clearGoogleRedirectError}
                aria-label="Dismiss"
                className="shrink-0 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="border-border-strong bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
        title={user.email ?? undefined}
        aria-label={user.email ? `Account settings for ${user.email}` : "Account settings"}
      >
        <CircleUserRound aria-hidden className="h-4 w-4" />
        <span className="hidden max-w-[10rem] truncate lg:inline">{user.email ?? "Account"}</span>
      </button>
      {settingsOpen && (
        <AccountSettingsDialog
          onClose={() => setSettingsOpen(false)}
          onSignedOut={() => {
            resetPapersStoreSessionCache();
            setSettingsOpen(false);
          }}
        />
      )}
    </>
  );
}

export async function handleSignOut(): Promise<void> {
  await signOutUser();
  resetPapersStoreSessionCache();
}
