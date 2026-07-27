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

export const personalPaperSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  codeName: z.string().optional(),
  authors: z.array(z.string()).default([]),
  researchAreas: z.array(researchAreaSchema).default([]),
  currentTarget: z.string().optional(),
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
