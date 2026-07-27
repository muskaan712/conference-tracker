import { z } from "zod";

/**
 * Canonical tier order used everywhere tiers are sorted or compared.
 * Index in this array = sort rank (lower = higher prestige).
 */
export const TIERS = ["A*", "A", "B", "C", "Unclassified"] as const;
export const tierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof tierSchema>;

/**
 * Verification state for an individual date or location field.
 * "previous-cycle" datums must never be rendered as confirmed for a future edition.
 */
export const VERIFICATION_STATUSES = [
  "official",
  "verified",
  "tentative",
  "previous-cycle",
  "discovered",
  "conflicting",
  "unverified",
] as const;
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const DEADLINE_TYPES = [
  "abstract",
  "full-paper",
  "arr-submission",
  "arr-commitment",
  "workshop-proposal",
  "workshop-paper",
  "demo",
  "industry-track",
  "dataset-resource-track",
  "author-response",
  "rebuttal",
  "notification",
  "camera-ready",
  "early-registration",
  "conference-start",
  "conference-end",
] as const;
export const deadlineTypeSchema = z.enum(DEADLINE_TYPES);
export type DeadlineType = z.infer<typeof deadlineTypeSchema>;

export const GEOGRAPHIC_CATEGORIES = [
  "Europe",
  "Outside Europe",
  "Online",
  "Hybrid",
  "Location not announced",
] as const;
export const geographicCategorySchema = z.enum(GEOGRAPHIC_CATEGORIES);
export type GeographicCategory = z.infer<typeof geographicCategorySchema>;

export const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;
export const continentSchema = z.enum(CONTINENTS);
export type Continent = z.infer<typeof continentSchema>;

export const RESEARCH_AREAS = [
  "ai",
  "ml",
  "nlp",
  "computer-vision",
  "information-retrieval",
  "data-mining",
  "medical-ai",
  "responsible-ai",
  "ai-systems",
  "human-centered-ai",
] as const;
export const researchAreaSchema = z.enum(RESEARCH_AREAS);
export type ResearchArea = z.infer<typeof researchAreaSchema>;

export const RESEARCH_AREA_LABELS: Record<ResearchArea, string> = {
  ai: "Artificial Intelligence",
  ml: "Machine Learning",
  nlp: "Natural Language Processing",
  "computer-vision": "Computer Vision",
  "information-retrieval": "Information Retrieval",
  "data-mining": "Data Mining",
  "medical-ai": "Medical AI",
  "responsible-ai": "Responsible / Trustworthy AI",
  "ai-systems": "AI Systems",
  "human-centered-ai": "Human-Centred AI",
};

export const PAPER_TYPES = [
  "long-paper",
  "short-paper",
  "findings",
  "workshop-paper",
  "demo-paper",
  "resource-paper",
  "industry-paper",
  "position-paper",
  "survey-paper",
] as const;
export const paperTypeSchema = z.enum(PAPER_TYPES);
export type PaperType = z.infer<typeof paperTypeSchema>;

export const rankingSchema = z.object({
  tier: tierSchema,
  source: z.string().optional(),
  edition: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  verifiedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type Ranking = z.infer<typeof rankingSchema>;

export const conferenceDateSchema = z.object({
  id: z.string(),
  type: deadlineTypeSchema,
  label: z.string(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  timezone: z.string(),
  isAoE: z.boolean().optional(),
  verificationStatus: verificationStatusSchema,
  sourceUrl: z.string().url().optional(),
  verifiedAt: z.string().optional(),
  discoveredAt: z.string().optional(),
  notes: z.string().optional(),
});
export type ConferenceDate = z.infer<typeof conferenceDateSchema>;

export const archiveEntrySchema = z.object({
  editionYear: z.number(),
  slug: z.string(),
  url: z.string().url().optional(),
});
export type ArchiveEntry = z.infer<typeof archiveEntrySchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  conferenceSlug: z.string(),
  field: z.string(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  sourceUrl: z.string().url().optional(),
  discoveredAt: z.string(),
  verificationStatus: verificationStatusSchema,
  updateMethod: z.enum(["automated", "manual"]),
  confidence: z.enum(["high", "medium", "low"]),
  reviewStatus: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const conferenceEditionSchema = z.object({
  name: z.string(),
  acronym: z.string(),
  slug: z.string(),
  editionYear: z.number(),
  description: z.string(),
  seriesId: z.string(),
  ranking: rankingSchema,
  researchAreas: z.array(researchAreaSchema).min(1),
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  continent: continentSchema.optional(),
  geographicCategory: geographicCategorySchema,
  venueName: z.string().optional(),
  isOnline: z.boolean().default(false),
  isHybrid: z.boolean().default(false),
  locationVerificationStatus: verificationStatusSchema,
  dates: z.array(conferenceDateSchema),
  tracks: z.array(z.string()).default([]),
  paperTypes: z.array(paperTypeSchema).default([]),
  submissionSystem: z.string().optional(),
  officialWebsiteUrl: z.string().url().optional(),
  cfpUrl: z.string().url().optional(),
  scheduleUrl: z.string().url().optional(),
  notes: z.string().optional(),
  referenceDates: z.array(conferenceDateSchema).default([]),
  archiveHistory: z.array(archiveEntrySchema).default([]),
  lastVerifiedAt: z.string().optional(),
  lastScannedAt: z.string().optional(),
  auditTrail: z.array(auditEntrySchema).default([]),
});
export type ConferenceEdition = z.infer<typeof conferenceEditionSchema>;

export const conferenceSeriesFileSchema = z.object({
  seriesId: z.string(),
  editions: z.array(conferenceEditionSchema).min(1),
});
export type ConferenceSeriesFile = z.infer<typeof conferenceSeriesFileSchema>;

export const discoverySourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.enum([
    "official-conference",
    "official-society",
    "official-cfp",
    "submission-system",
    "discovery-only",
  ]),
  conferenceSeries: z.string().optional(),
  enabled: z.boolean(),
  trustLevel: z.enum(["official", "secondary", "discovery-only"]),
  scanFrequency: z.enum(["weekly", "monthly"]),
  parser: z.string().optional(),
  notes: z.string().optional(),
  lastSuccessfulScan: z.string().optional(),
  lastCheckedAt: z.string().optional(),
  isDead: z.boolean().optional(),
});
export type DiscoverySource = z.infer<typeof discoverySourceSchema>;
