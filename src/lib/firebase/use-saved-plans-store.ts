"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "../use-local-storage";
import { useFirebaseAuth, useFirebaseEnabled } from "./use-firebase-auth";
import {
  deletePlanFromCloud,
  getPlannerPreferences,
  listSavedPlans,
  savePlanToCloud,
  setPlannerPreferences,
} from "./firestore-data";
import type { SavedResubmissionPlan } from "./firestore-schema";

const SAVED_PLANS_KEY = "ai-conference-tracker.saved-plans.v1";

export type PlanStorageTarget = "local" | "cloud";

export interface SavedPlanEntry {
  plan: SavedResubmissionPlan;
  storage: PlanStorageTarget;
}

export interface SavedPlansStore {
  entries: SavedPlanEntry[];
  hydrated: boolean;
  /** Whether cloud storage is even offered as a choice right now (signed in + Firebase enabled). */
  cloudAvailable: boolean;
  /** The most recently chosen storage target for this user — defaults new saves to it. */
  defaultStorage: PlanStorageTarget;
  savePlan: (plan: SavedResubmissionPlan, storage: PlanStorageTarget) => Promise<void>;
  deletePlan: (id: string, storage: PlanStorageTarget) => Promise<void>;
}

export function useSavedPlansStore(): SavedPlansStore {
  const firebaseEnabled = useFirebaseEnabled();
  const { user, initializing } = useFirebaseAuth();
  const [localPlans, setLocalPlans, localHydrated] = useLocalStorage<SavedResubmissionPlan[]>(
    SAVED_PLANS_KEY,
    [],
  );
  const [cloudPlans, setCloudPlans] = useState<SavedResubmissionPlan[]>([]);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [defaultStorage, setDefaultStorage] = useState<PlanStorageTarget>("local");

  const cloudAvailable = firebaseEnabled && !initializing && Boolean(user);
  const identityKey = cloudAvailable && user ? user.uid : null;

  // Reset cloud state synchronously during render when identity changes —
  // see the identical pattern (and rationale) in use-papers-store.ts.
  const [trackedIdentity, setTrackedIdentity] = useState(identityKey);
  if (trackedIdentity !== identityKey) {
    setTrackedIdentity(identityKey);
    setCloudPlans([]);
    setCloudHydrated(!firebaseEnabled || !initializing);
  }

  useEffect(() => {
    if (!identityKey) return;
    let cancelled = false;
    Promise.all([listSavedPlans(identityKey), getPlannerPreferences(identityKey)]).then(
      ([plans, prefs]) => {
        if (cancelled) return;
        setCloudPlans(plans);
        setCloudHydrated(true);
        if (prefs) setDefaultStorage(prefs.preferredPlanStorage);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [identityKey]);

  const savePlan = useCallback(
    async (plan: SavedResubmissionPlan, storage: PlanStorageTarget) => {
      if (storage === "cloud" && user) {
        await savePlanToCloud(user.uid, plan);
        setCloudPlans(await listSavedPlans(user.uid));
        await setPlannerPreferences(user.uid, {
          preferredPlanStorage: "cloud",
          updatedAt: new Date().toISOString(),
        });
        setDefaultStorage("cloud");
      } else {
        setLocalPlans((prev) => [...prev.filter((p) => p.id !== plan.id), plan]);
        if (user) {
          await setPlannerPreferences(user.uid, {
            preferredPlanStorage: "local",
            updatedAt: new Date().toISOString(),
          });
        }
        setDefaultStorage("local");
      }
    },
    [user, setLocalPlans],
  );

  const deletePlan = useCallback(
    async (id: string, storage: PlanStorageTarget) => {
      if (storage === "cloud" && user) {
        await deletePlanFromCloud(user.uid, id);
        setCloudPlans(await listSavedPlans(user.uid));
      } else {
        setLocalPlans((prev) => prev.filter((p) => p.id !== id));
      }
    },
    [user, setLocalPlans],
  );

  const entries: SavedPlanEntry[] = [
    ...localPlans.map((plan) => ({ plan, storage: "local" as const })),
    ...cloudPlans.map((plan) => ({ plan, storage: "cloud" as const })),
  ];

  return {
    entries,
    hydrated: localHydrated && cloudHydrated,
    cloudAvailable,
    defaultStorage,
    savePlan,
    deletePlan,
  };
}
