/**
 * Firestore Security Rules regression tests, run against the local Firestore
 * emulator via @firebase/rules-unit-testing. NOT part of the default `npm
 * test` run (excluded by vitest.config.ts's `include` glob) and does not
 * require any live production Firebase project or credentials.
 *
 * Run with: npm run test:rules
 * (spins up the emulator via `firebase emulators:exec`, runs this file, then
 * tears the emulator down — requires a local Java runtime; see
 * docs/FIREBASE_SETUP.md.)
 */
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-conference-tracker";

function validPaper(ownerUid: string) {
  return {
    ownerUid,
    schemaVersion: 1,
    id: "p1",
    title: "Test paper",
    authors: [],
    researchAreas: [],
    fallbackConferences: [],
    minAcceptableTier: "Unclassified",
    europePreference: "none",
    stage: "Idea",
    importantDates: [],
    tasks: [],
    colorLabel: "slate",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("firestore.rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  it("denies all access to an unauthenticated user", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice/papers/p1")));
    await assertFails(setDoc(doc(db, "users/alice/papers/p1"), validPaper("alice")));
  });

  it("allows a signed-in user to create and read their own valid paper", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "users/alice/papers/p1"), validPaper("alice")));
    await assertSucceeds(getDoc(doc(db, "users/alice/papers/p1")));
  });

  it("prevents user A from reading user B's papers", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/bob/papers/p1"), validPaper("bob"));
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(aliceDb, "users/bob/papers/p1")));
  });

  it("prevents user A from writing under user B's uid", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "users/bob/papers/p1"), validPaper("bob")));
  });

  it("allows a user to update their own valid record", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/papers/p1"), validPaper("alice"));
    });
    await assertSucceeds(updateDoc(doc(db, "users/alice/papers/p1"), { title: "Updated title" }));
  });

  it("prevents changing ownerUid on update", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/papers/p1"), validPaper("alice"));
    });
    await assertFails(setDoc(doc(db, "users/alice/papers/p1"), validPaper("mallory")));
  });

  it("rejects a document with an invalid schemaVersion", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "users/alice/papers/p1"), { ...validPaper("alice"), schemaVersion: 0 }),
    );
  });

  it("rejects a document missing ownerUid entirely", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const { ownerUid: _omit, ...withoutOwner } = validPaper("alice");
    void _omit;
    await assertFails(setDoc(doc(db, "users/alice/papers/p1"), withoutOwner));
  });

  it("allows a user to delete their own record", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/papers/p1"), validPaper("alice"));
    });
    await assertSucceeds(deleteDoc(doc(db, "users/alice/papers/p1")));
  });

  it("denies writing to a path outside the known per-user collections", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users/alice/somethingElse/x1"), { ownerUid: "alice" }));
  });

  it("denies writing to a top-level public-looking path (no public conference data lives in Firestore)", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "conferences/neurips-2026"), { name: "hacked" }));
  });
});
