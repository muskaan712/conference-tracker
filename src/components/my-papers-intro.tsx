"use client";

import { useFirebaseAuth, useFirebaseEnabled } from "@/lib/firebase/use-firebase-auth";

/**
 * The storage explanation directly under the "My papers" heading. Must
 * describe the storage mode that is actually active — signed-in users are
 * synced to Firestore, not "local only" — so this reads live auth state
 * rather than a single static, guest-only sentence baked into the page.
 * Uses the lightweight useFirebaseAuth()/useFirebaseEnabled() hooks (a
 * shared module-level subscription — see use-firebase-auth.ts) rather than
 * the full usePersonalPapersStore(), so this doesn't duplicate that store's
 * own Firestore fetch/migration side effects.
 */
export function MyPapersIntro() {
  const firebaseEnabled = useFirebaseEnabled();
  const { user, initializing } = useFirebaseAuth();
  const signedIn = firebaseEnabled && !initializing && Boolean(user);

  return (
    <p className="text-muted-foreground mt-1 max-w-2xl">
      {signedIn ? (
        <>
          A planning board for your own papers. Signed in, everything here is synced through
          Firebase Cloud Firestore to your account — readable only by you, on any device you sign in
          on.
        </>
      ) : (
        <>
          A private planning board for your own papers. As a guest, everything here is stored only
          in this browser&apos;s local storage — nothing is sent to a server, and nobody else can
          see it.
        </>
      )}
    </p>
  );
}
