"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../use-local-storage";
import { migratePersonalPaperRecord, type PersonalPaper } from "../paper-schema";
import { useFirebaseAuth, useFirebaseEnabled } from "./use-firebase-auth";
import {
  clearFirestoreSessionCache,
  deletePaperFromCloud,
  listPapers,
  savePaperToCloud,
} from "./firestore-data";
import {
  previewMigration,
  resolveMigration,
  type MigrationChoice,
  type MigrationPreview,
} from "./migration";

const STORAGE_KEY = "ai-conference-tracker.my-papers.v1";

export type PapersStorageMode = "guest" | "cloud";

/**
 * Restrained status for the small sync indicator in PersonalPaperBoard —
 * "saved-locally" for guest mode, otherwise reflecting the most recent
 * Firestore round-trip.
 */
export type SyncStatus = "saved-locally" | "syncing" | "synced" | "error";

export interface PersonalPapersStore {
  papers: PersonalPaper[];
  hydrated: boolean;
  mode: PapersStorageMode;
  syncStatus: SyncStatus;
  savePaper: (paper: PersonalPaper) => Promise<void>;
  deletePaper: (id: string) => Promise<void>;
  replaceAll: (papers: PersonalPaper[]) => Promise<void>;
  /** Set only once, right after sign-in, when both guest and cloud data exist and need a resolution choice. */
  pendingMigration: MigrationPreview | null;
  resolvePendingMigration: (choice: MigrationChoice, keepLocalCopy: boolean) => Promise<void>;
}

/**
 * Unifies guest (localStorage) and signed-in (Firestore) storage behind one
 * interface so PersonalPaperBoard doesn't need to know which is active. In
 * guest mode (signed out, or Firebase disabled/unconfigured) this is a thin
 * wrapper over useLocalStorage — behaviour is byte-for-byte the same as
 * before Firebase existed.
 */
export function usePersonalPapersStore(): PersonalPapersStore {
  const firebaseEnabled = useFirebaseEnabled();
  const { user, initializing } = useFirebaseAuth();
  const [storedLocalPapers, setLocalPapers, localHydrated] = useLocalStorage<PersonalPaper[]>(
    STORAGE_KEY,
    [],
  );
  const localPapers = useMemo(
    () => storedLocalPapers.map((p) => migratePersonalPaperRecord(p) as PersonalPaper),
    [storedLocalPapers],
  );

  const [cloudPapers, setCloudPapers] = useState<PersonalPaper[] | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [pendingMigration, setPendingMigration] = useState<MigrationPreview | null>(null);
  const [migrationResolved, setMigrationResolved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saved-locally");

  const signedIn = firebaseEnabled && !initializing && Boolean(user);
  const identityKey = signedIn && user ? user.uid : null;

  // Reset cloud state synchronously during render when the signed-in
  // identity changes (sign-out, or a different account signs in) — the
  // React-recommended "adjusting state when a prop changes" pattern, not an
  // effect, so a previous user's cloud papers never flash into a new guest
  // or different-account session (see Part 6 "Sign-out behaviour").
  const [trackedIdentity, setTrackedIdentity] = useState(identityKey);
  if (trackedIdentity !== identityKey) {
    setTrackedIdentity(identityKey);
    setCloudPapers(null);
    setCloudLoaded(false);
    setMigrationResolved(false);
    setPendingMigration(null);
    setSyncStatus(identityKey ? "syncing" : "saved-locally");
  }

  // Fetch cloud papers once per sign-in. A plain data-fetch effect calling
  // setState only inside its async callback — the sanctioned "subscribe to
  // an external system" pattern, not the synchronous-in-effect anti-pattern.
  useEffect(() => {
    if (!identityKey) return;
    let cancelled = false;
    // syncStatus is already set to "syncing" synchronously above, in the
    // trackedIdentity render-time adjustment — not here, to avoid the
    // set-state-in-effect anti-pattern.
    listPapers(identityKey)
      .then((papers) => {
        if (cancelled) return;
        setCloudPapers(papers);
        setCloudLoaded(true);
        setSyncStatus("synced");
        const preview = previewMigration(localPapers, papers);
        if (preview.localOnlyCount > 0 && !migrationResolved) {
          setPendingMigration(preview);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[papers] Failed to load papers from Firestore:", error);
        setCloudLoaded(true);
        setSyncStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // localPapers/migrationResolved intentionally excluded: this effect
    // should only re-run when the *signed-in user* changes, not on every
    // local-storage tick, to avoid re-prompting migration repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  const mode: PapersStorageMode = signedIn ? "cloud" : "guest";
  const papers = mode === "cloud" ? (cloudPapers ?? []) : localPapers;
  const hydrated = mode === "cloud" ? cloudLoaded : localHydrated;

  const savePaper = useCallback(
    async (paper: PersonalPaper) => {
      if (mode === "cloud" && user) {
        setSyncStatus("syncing");
        try {
          await savePaperToCloud(user.uid, paper);
          const next = await listPapers(user.uid);
          setCloudPapers(next);
          setSyncStatus("synced");
        } catch (error) {
          console.error("[papers] Failed to save paper to Firestore:", error);
          setSyncStatus("error");
        }
        return;
      }
      setLocalPapers((prev) => {
        const exists = prev.some((p) => p.id === paper.id);
        return exists ? prev.map((p) => (p.id === paper.id ? paper : p)) : [...prev, paper];
      });
    },
    [mode, user, setLocalPapers],
  );

  const deletePaper = useCallback(
    async (id: string) => {
      if (mode === "cloud" && user) {
        setSyncStatus("syncing");
        try {
          await deletePaperFromCloud(user.uid, id);
          const next = await listPapers(user.uid);
          setCloudPapers(next);
          setSyncStatus("synced");
        } catch (error) {
          console.error("[papers] Failed to delete paper from Firestore:", error);
          setSyncStatus("error");
        }
        return;
      }
      setLocalPapers((prev) => prev.filter((p) => p.id !== id));
    },
    [mode, user, setLocalPapers],
  );

  const replaceAll = useCallback(
    async (next: PersonalPaper[]) => {
      if (mode === "cloud" && user) {
        setSyncStatus("syncing");
        try {
          await Promise.all(next.map((p) => savePaperToCloud(user.uid, p)));
          const refreshed = await listPapers(user.uid);
          setCloudPapers(refreshed);
          setSyncStatus("synced");
        } catch (error) {
          console.error("[papers] Failed to sync papers to Firestore:", error);
          setSyncStatus("error");
        }
        return;
      }
      setLocalPapers(next);
    },
    [mode, user, setLocalPapers],
  );

  const resolvePendingMigration = useCallback(
    async (choice: MigrationChoice, keepLocalCopy: boolean) => {
      if (!user) return;
      const resolved = resolveMigration(choice, localPapers, cloudPapers ?? []);
      setPendingMigration(null);
      setMigrationResolved(true);
      if (resolved === null) return; // cancelled
      await Promise.all(resolved.map((p) => savePaperToCloud(user.uid, p)));
      const refreshed = await listPapers(user.uid);
      setCloudPapers(refreshed);
      if (!keepLocalCopy) setLocalPapers([]);
    },
    [user, localPapers, cloudPapers, setLocalPapers],
  );

  return {
    papers,
    hydrated,
    mode,
    syncStatus,
    savePaper,
    deletePaper,
    replaceAll,
    pendingMigration,
    resolvePendingMigration,
  };
}

export function resetPapersStoreSessionCache(): void {
  clearFirestoreSessionCache();
}
