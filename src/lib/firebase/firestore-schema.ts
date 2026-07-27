import { z } from "zod";
import { personalPaperSchema } from "../paper-schema";
import { researchAreaSchema, tierSchema, paperTypeSchema } from "../schema";
import { geographicPreferenceSchema } from "../paper-schema";

export const CLOUD_SCHEMA_VERSION = 1;

/** Fields every cloud-stored record carries in addition to its own data — see Part 6 "Firestore data architecture". */
export const cloudMetaSchema = z.object({
  ownerUid: z.string().min(1),
  schemaVersion: z.number().default(CLOUD_SCHEMA_VERSION),
});

export const cloudPaperSchema = personalPaperSchema.merge(cloudMetaSchema);
export type CloudPaper = z.infer<typeof cloudPaperSchema>;

export const savedResubmissionPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Plan name is required"),
  expectedNotificationDate: z.string(),
  researchAreas: z.array(researchAreaSchema).default([]),
  minTier: tierSchema,
  maxTier: tierSchema,
  geographicPreference: geographicPreferenceSchema,
  minBufferDays: z.number(),
  paperType: paperTypeSchema.optional(),
  requiredTrack: z.string().optional(),
  includeEvents: z.boolean().default(false),
  /** Slugs of conferences/events the plan run surfaced and the user chose to keep. */
  selectedTargets: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedResubmissionPlan = z.infer<typeof savedResubmissionPlanSchema>;

export const cloudResubmissionPlanSchema = savedResubmissionPlanSchema.merge(cloudMetaSchema);
export type CloudResubmissionPlan = z.infer<typeof cloudResubmissionPlanSchema>;

export const favouriteSchema = z.object({
  id: z.string(),
  targetType: z.enum(["conference", "event"]),
  targetSlug: z.string(),
  createdAt: z.string(),
});
export type Favourite = z.infer<typeof favouriteSchema>;

export const cloudFavouriteSchema = favouriteSchema.merge(cloudMetaSchema);
export type CloudFavourite = z.infer<typeof cloudFavouriteSchema>;

export const plannerPreferencesSchema = z.object({
  preferredPlanStorage: z.enum(["local", "cloud"]).default("local"),
  updatedAt: z.string(),
});
export type PlannerPreferences = z.infer<typeof plannerPreferencesSchema>;

export const cloudPreferencesSchema = plannerPreferencesSchema.merge(cloudMetaSchema);
export type CloudPreferences = z.infer<typeof cloudPreferencesSchema>;

export interface CloudExportBundle {
  exportedAt: string;
  schemaVersion: number;
  papers: CloudPaper[];
  resubmissionPlans: CloudResubmissionPlan[];
  favourites: CloudFavourite[];
  preferences: PlannerPreferences | null;
}
