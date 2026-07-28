"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { getFirebaseServices } from "./client";
import type { PersonalPaper } from "../paper-schema";
import { sanitizeForFirestore } from "./firestore-sanitize";
import {
  CLOUD_SCHEMA_VERSION,
  cloudFavouriteSchema,
  cloudPaperSchema,
  cloudPreferencesSchema,
  cloudResubmissionPlanSchema,
  type CloudExportBundle,
  type CloudFavourite,
  type CloudPaper,
  type CloudPreferences,
  type CloudResubmissionPlan,
  type Favourite,
  type PlannerPreferences,
  type SavedResubmissionPlan,
} from "./firestore-schema";

/**
 * users/{uid}/papers/{paperId}
 * users/{uid}/resubmissionPlans/{planId}
 * users/{uid}/favourites/{favouriteId}
 * users/{uid}/preferences/main
 *
 * Chosen over a single-document-per-user model because it minimises reads
 * (only the collections actually opened get fetched) and lets Firestore
 * Security Rules validate each record type independently — see firestore.rules.
 */
function requireDb() {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  return services.db;
}

// In-memory, per-session cache so switching tabs/routes doesn't re-fetch a
// user's full collection repeatedly — cleared on sign-out (see auth
// context wiring in use-cloud-store.ts).
const sessionCache = new Map<string, unknown>();

export function clearFirestoreSessionCache(): void {
  sessionCache.clear();
}

function cacheKey(uid: string, collectionName: string): string {
  return `${uid}/${collectionName}`;
}

export async function listPapers(uid: string): Promise<CloudPaper[]> {
  const key = cacheKey(uid, "papers");
  if (sessionCache.has(key)) return sessionCache.get(key) as CloudPaper[];
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "users", uid, "papers"));
  const papers = snapshot.docs.map((d) => d.data() as CloudPaper);
  sessionCache.set(key, papers);
  return papers;
}

export async function savePaperToCloud(uid: string, paper: PersonalPaper): Promise<void> {
  const db = requireDb();
  const record: CloudPaper = { ...paper, ownerUid: uid, schemaVersion: CLOUD_SCHEMA_VERSION };
  const validated = cloudPaperSchema.parse(sanitizeForFirestore(record));
  await writeBatchSet(db, ["users", uid, "papers", paper.id], validated);
  sessionCache.delete(cacheKey(uid, "papers"));
}

export async function deletePaperFromCloud(uid: string, paperId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, "users", uid, "papers", paperId));
  sessionCache.delete(cacheKey(uid, "papers"));
}

export async function listSavedPlans(uid: string): Promise<CloudResubmissionPlan[]> {
  const key = cacheKey(uid, "resubmissionPlans");
  if (sessionCache.has(key)) return sessionCache.get(key) as CloudResubmissionPlan[];
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "users", uid, "resubmissionPlans"));
  const plans = snapshot.docs.map((d) => d.data() as CloudResubmissionPlan);
  sessionCache.set(key, plans);
  return plans;
}

export async function savePlanToCloud(uid: string, plan: SavedResubmissionPlan): Promise<void> {
  const db = requireDb();
  const record: CloudResubmissionPlan = {
    ...plan,
    ownerUid: uid,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
  const validated = cloudResubmissionPlanSchema.parse(sanitizeForFirestore(record));
  await writeBatchSet(db, ["users", uid, "resubmissionPlans", plan.id], validated);
  sessionCache.delete(cacheKey(uid, "resubmissionPlans"));
}

export async function deletePlanFromCloud(uid: string, planId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, "users", uid, "resubmissionPlans", planId));
  sessionCache.delete(cacheKey(uid, "resubmissionPlans"));
}

export async function listFavourites(uid: string): Promise<CloudFavourite[]> {
  const key = cacheKey(uid, "favourites");
  if (sessionCache.has(key)) return sessionCache.get(key) as CloudFavourite[];
  const db = requireDb();
  const snapshot = await getDocs(collection(db, "users", uid, "favourites"));
  const favourites = snapshot.docs.map((d) => d.data() as CloudFavourite);
  sessionCache.set(key, favourites);
  return favourites;
}

export async function saveFavouriteToCloud(uid: string, favourite: Favourite): Promise<void> {
  const db = requireDb();
  const record: CloudFavourite = {
    ...favourite,
    ownerUid: uid,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
  const validated = cloudFavouriteSchema.parse(sanitizeForFirestore(record));
  await writeBatchSet(db, ["users", uid, "favourites", favourite.id], validated);
  sessionCache.delete(cacheKey(uid, "favourites"));
}

export async function deleteFavouriteFromCloud(uid: string, favouriteId: string): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, "users", uid, "favourites", favouriteId));
  sessionCache.delete(cacheKey(uid, "favourites"));
}

export async function getPlannerPreferences(uid: string): Promise<PlannerPreferences | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, "users", uid, "preferences", "main"));
  if (!snap.exists()) return null;
  const data = snap.data() as CloudPreferences;
  return { preferredPlanStorage: data.preferredPlanStorage, updatedAt: data.updatedAt };
}

export async function setPlannerPreferences(uid: string, prefs: PlannerPreferences): Promise<void> {
  const db = requireDb();
  const record: CloudPreferences = { ...prefs, ownerUid: uid, schemaVersion: CLOUD_SCHEMA_VERSION };
  const validated = cloudPreferencesSchema.parse(sanitizeForFirestore(record));
  await writeBatchSet(db, ["users", uid, "preferences", "main"], validated);
}

/**
 * Deletes every known record this app writes under users/{uid} — papers,
 * saved plans, favourites, and preferences. This is a *client-side*
 * enumeration of this app's own known collections, not a generic recursive
 * delete; it is safe here because the app never writes anywhere else under
 * the user's document. See docs/FIREBASE_SETUP.md for why a true
 * server-side recursive delete (a Cloud Function) is out of scope for the
 * Spark (free) plan this project targets.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const db = requireDb();
  const [papers, plans, favourites] = await Promise.all([
    getDocs(collection(db, "users", uid, "papers")),
    getDocs(collection(db, "users", uid, "resubmissionPlans")),
    getDocs(collection(db, "users", uid, "favourites")),
  ]);
  const batch = writeBatch(db);
  papers.docs.forEach((d) => batch.delete(d.ref));
  plans.docs.forEach((d) => batch.delete(d.ref));
  favourites.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "users", uid, "preferences", "main"));
  await batch.commit();
  clearFirestoreSessionCache();
}

export async function exportAllUserData(uid: string): Promise<CloudExportBundle> {
  const [papers, plans, favourites, preferences] = await Promise.all([
    listPapers(uid),
    listSavedPlans(uid),
    listFavourites(uid),
    getPlannerPreferences(uid),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: CLOUD_SCHEMA_VERSION,
    papers,
    resubmissionPlans: plans,
    favourites,
    preferences,
  };
}

/**
 * Shared write path for every Firestore `set()` in this module. Sanitizes
 * defensively (on top of whatever the caller already sanitized/validated)
 * so no future call site can reintroduce the `undefined`-field bug just by
 * forgetting the step — see firestore-sanitize.ts.
 */
async function writeBatchSet(
  db: ReturnType<typeof requireDb>,
  pathSegments: string[],
  data: Record<string, unknown>,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, pathSegments[0], ...pathSegments.slice(1)), sanitizeForFirestore(data));
  await batch.commit();
}
