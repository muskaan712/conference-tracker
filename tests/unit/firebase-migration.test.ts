import { describe, expect, it } from "vitest";
import { mergePaperSets, previewMigration, resolveMigration } from "@/lib/firebase/migration";
import type { PersonalPaper } from "@/lib/paper-schema";

function paper(overrides: Partial<PersonalPaper> = {}): PersonalPaper {
  return {
    id: "p1",
    title: "A paper",
    authors: [],
    researchAreas: [],
    fallbackConferences: [],
    minAcceptableTier: "Unclassified",
    europePreference: "none",
    stage: "Idea",
    importantDates: [],
    tasks: [],
    colorLabel: "slate",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("previewMigration", () => {
  it("counts local-only papers correctly", () => {
    const local = [paper({ id: "a" }), paper({ id: "b" })];
    const cloud = [paper({ id: "a" })];
    const preview = previewMigration(local, cloud);
    expect(preview).toEqual({ localPaperCount: 2, cloudPaperCount: 1, localOnlyCount: 1 });
  });
});

describe("mergePaperSets", () => {
  it("keeps a cloud-only paper untouched", () => {
    const cloudOnly = paper({ id: "cloud-only" });
    const merged = mergePaperSets([], [cloudOnly]);
    expect(merged).toEqual([cloudOnly]);
  });

  it("adds a local-only paper that doesn't exist in the cloud", () => {
    const localOnly = paper({ id: "local-only" });
    const merged = mergePaperSets([localOnly], []);
    expect(merged).toEqual([localOnly]);
  });

  it("prefers the newer record by updatedAt when the same id exists in both", () => {
    const older = paper({
      id: "shared",
      title: "Old title",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = paper({
      id: "shared",
      title: "New title",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(mergePaperSets([newer], [older])).toEqual([newer]);
    expect(mergePaperSets([older], [newer])).toEqual([newer]);
  });

  it("never lets an older local record silently overwrite a newer cloud record", () => {
    const olderLocal = paper({
      id: "shared",
      title: "Stale local edit",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    const newerCloud = paper({
      id: "shared",
      title: "Current cloud version",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const merged = mergePaperSets([olderLocal], [newerCloud]);
    expect(merged[0].title).toBe("Current cloud version");
  });
});

describe("resolveMigration", () => {
  const local = [paper({ id: "local", updatedAt: "2020-01-01T00:00:00.000Z" })];
  const cloud = [paper({ id: "cloud", updatedAt: "2026-01-01T00:00:00.000Z" })];

  it("keep-cloud returns only the cloud set", () => {
    expect(resolveMigration("keep-cloud", local, cloud)).toEqual(cloud);
  });

  it("import-local returns only the local set", () => {
    expect(resolveMigration("import-local", local, cloud)).toEqual(local);
  });

  it("merge combines both sets", () => {
    const result = resolveMigration("merge", local, cloud);
    expect(result).toHaveLength(2);
  });

  it("cancel returns null (caller must not upload anything)", () => {
    expect(resolveMigration("cancel", local, cloud)).toBeNull();
  });
});
