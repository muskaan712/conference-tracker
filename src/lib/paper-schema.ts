import { z } from "zod";
import { researchAreaSchema, tierSchema } from "./schema";

export const PAPER_STAGES = [
  "Idea",
  "Experiments",
  "Analysis",
  "Drafting",
  "Internal Review",
  "Submitted",
  "Author Response",
  "Accepted",
  "Rejected",
  "Revising",
  "Camera Ready",
  "Presented",
] as const;
export const paperStageSchema = z.enum(PAPER_STAGES);
export type PaperStage = z.infer<typeof paperStageSchema>;

export const geographicPreferenceSchema = z.enum(["europe-only", "outside-europe", "none"]);

/** What kind of venue a personal paper's target/fallbacks can point at. */
export const PAPER_TARGET_TYPES = [
  "main-conference",
  "workshop",
  "shared-task",
  "competition",
  "special-session",
  "doctoral-consortium",
  "demo-track",
] as const;
export const paperTargetTypeSchema = z.enum(PAPER_TARGET_TYPES);
export type PaperTargetType = z.infer<typeof paperTargetTypeSchema>;

export const PAPER_TARGET_TYPE_LABELS: Record<PaperTargetType, string> = {
  "main-conference": "Main conference",
  workshop: "Workshop",
  "shared-task": "Shared task",
  competition: "Competition",
  "special-session": "Special session",
  "doctoral-consortium": "Doctoral consortium",
  "demo-track": "Demo track",
};

export const paperTargetSchema = z.object({
  type: paperTargetTypeSchema.default("main-conference"),
  label: z.string().min(1, "Target label is required"),
  /** Conference edition slug (main-conference) or event slug (everything else), when known. */
  slug: z.string().optional(),
});
export type PaperTarget = z.infer<typeof paperTargetSchema>;

export const PAPER_COLOR_LABELS = ["slate", "amber", "emerald", "sky", "violet", "rose"] as const;
export const paperColorLabelSchema = z.enum(PAPER_COLOR_LABELS);

export const paperTaskSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Task label is required"),
  done: z.boolean().default(false),
});
export type PaperTask = z.infer<typeof paperTaskSchema>;

export const paperImportantDateSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Date label is required"),
  date: z.string().min(1, "Date is required"),
});
export type PaperImportantDate = z.infer<typeof paperImportantDateSchema>;

export const PERSONAL_PAPER_SCHEMA_VERSION = 2;

export const personalPaperSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  codeName: z.string().optional(),
  authors: z.array(z.string()).default([]),
  researchAreas: z.array(researchAreaSchema).default([]),
  /** Structured since schema v2 — see migratePersonalPaper() for v1 (plain string) upgrade. */
  currentTarget: paperTargetSchema.optional(),
  fallbackConferences: z.array(z.string()).default([]),
  minAcceptableTier: tierSchema.default("Unclassified"),
  europePreference: geographicPreferenceSchema.default("none"),
  stage: paperStageSchema.default("Idea"),
  importantDates: z.array(paperImportantDateSchema).default([]),
  tasks: z.array(paperTaskSchema).default([]),
  notes: z.string().optional(),
  colorLabel: paperColorLabelSchema.default("slate"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PersonalPaper = z.infer<typeof personalPaperSchema>;

/**
 * Upgrades a persisted paper record of unknown vintage to the current shape.
 * Schema v1 stored `currentTarget` as a plain string (always implicitly a
 * main conference); v2 stores a structured `{ type, label, slug? }` so a
 * target can also be a workshop, shared task, competition, etc. Never throws
 * on legacy data — falls back to leaving fields unset rather than dropping
 * the whole record.
 */
export function migratePersonalPaperRecord(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  if (typeof record.currentTarget === "string") {
    const label = record.currentTarget;
    return {
      ...record,
      currentTarget: label ? { type: "main-conference", label } : undefined,
    };
  }
  return record;
}

export const personalPaperExportSchema = z.object({
  exportedAt: z.string(),
  version: z.literal(1),
  papers: z.array(personalPaperSchema),
});
export type PersonalPaperExport = z.infer<typeof personalPaperExportSchema>;

export function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
