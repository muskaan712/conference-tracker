"use client";

import { useState } from "react";
import { CircleUserRound } from "lucide-react";
import { useFirebaseAuth, useFirebaseEnabled } from "@/lib/firebase/use-firebase-auth";
import { signOutUser } from "@/lib/firebase/auth-actions";
import { resetPapersStoreSessionCache } from "@/lib/firebase/use-papers-store";
import { AuthModal } from "./auth-modal";
import { AccountSettingsDialog } from "./account-settings-dialog";

export function AccountMenu() {
  const firebaseEnabled = useFirebaseEnabled();
  const { user, initializing } = useFirebaseAuth();
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
        >
          <CircleUserRound aria-hidden className="h-4 w-4" />
          Sign in
        </button>
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
      >
        <CircleUserRound aria-hidden className="h-4 w-4" />
        <span className="max-w-[10rem] truncate">{user.email ?? "Account"}</span>
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
