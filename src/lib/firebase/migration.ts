import type { PersonalPaper } from "../paper-schema";

export type MigrationChoice = "keep-cloud" | "import-local" | "merge" | "cancel";

export interface MigrationPreview {
  localPaperCount: number;
  cloudPaperCount: number;
  /** Papers that exist locally but not in the cloud (by id) — these are what "import local" would add. */
  localOnlyCount: number;
}

export function previewMigration(local: PersonalPaper[], cloud: PersonalPaper[]): MigrationPreview {
  const cloudIds = new Set(cloud.map((p) => p.id));
  return {
    localPaperCount: local.length,
    cloudPaperCount: cloud.length,
    localOnlyCount: local.filter((p) => !cloudIds.has(p.id)).length,
  };
}

/**
 * Deduplicates by stable `id`, resolving any conflict by `updatedAt` — the
 * newer record wins, and a cloud record is never silently overwritten by an
 * older local one. Pure function: no network/localStorage access, so it's
 * fully unit-testable. Used for the "Merge" migration choice.
 */
export function mergePaperSets(local: PersonalPaper[], cloud: PersonalPaper[]): PersonalPaper[] {
  const byId = new Map<string, PersonalPaper>();
  for (const paper of cloud) byId.set(paper.id, paper);
  for (const paper of local) {
    const existing = byId.get(paper.id);
    if (!existing) {
      byId.set(paper.id, paper);
      continue;
    }
    const localIsNewer =
      new Date(paper.updatedAt).getTime() > new Date(existing.updatedAt).getTime();
    if (localIsNewer) byId.set(paper.id, paper);
  }
  return [...byId.values()];
}

/**
 * Resolves which paper set should become the active set for a given
 * migration choice. Never mutates its inputs and never deletes the local
 * copy as a side effect — the caller decides separately whether to clear
 * local storage afterwards (see "keep or remove the local copy" in Part 6).
 */
export function resolveMigration(
  choice: MigrationChoice,
  local: PersonalPaper[],
  cloud: PersonalPaper[],
): PersonalPaper[] | null {
  switch (choice) {
    case "keep-cloud":
      return cloud;
    case "import-local":
      return local;
    case "merge":
      return mergePaperSets(local, cloud);
    case "cancel":
      return null;
  }
}
