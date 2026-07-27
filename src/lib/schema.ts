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
  // Associated-event date types. These reuse the same verification/timezone/AoE
  // machinery as main-conference dates — see status.ts / datetime.ts / ics.ts.
  // Deliberately kept in the *same* enum (rather than a second date subsystem)
  // so every existing date-handling utility works on event dates unmodified.
  "tutorial-proposal",
  "special-session-proposal",
  "workshop-abstract",
  "tutorial-material",
  "shared-task-registration",
  "shared-task-data-release",
  "shared-task-submission",
  "competition-registration",
  "competition-submission",
  "challenge-deadline",
  "doctoral-consortium-deadline",
  "event-start",
  "event-end",
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
    // Associated-event source types (Part 3 "Discovery source registry").
    "important-dates",
    "workshop-programme",
    "tutorial-programme",
    "individual-workshop",
    "shared-task",
    "competition",
  ]),
  conferenceSeries: z.string().optional(),
  /** Set when this source scans/represents a single edition rather than a series generally. */
  editionYear: z.number().optional(),
  /** Set when this source is scoped to one specific associated event rather than the parent conference. */
  eventId: z.string().optional(),
  eventType: z.string().optional(),
  enabled: z.boolean(),
  trustLevel: z.enum(["official", "secondary", "discovery-only"]),
  scanFrequency: z.enum(["weekly", "monthly"]),
  parser: z.string().optional(),
  notes: z.string().optional(),
  lastSuccessfulScan: z.string().optional(),
  lastCheckedAt: z.string().optional(),
  lastFailure: z.string().optional(),
  failureCount: z.number().default(0),
  isDead: z.boolean().optional(),
});
export type DiscoverySource = z.infer<typeof discoverySourceSchema>;

// ---------------------------------------------------------------------------
// Associated events (workshops, tutorials, shared tasks, competitions, etc.)
// ---------------------------------------------------------------------------

export const CO_LOCATED_EVENT_TYPES = [
  "workshop",
  "tutorial",
  "shared-task",
  "competition",
  "challenge",
  "demo-track",
  "industry-track",
  "doctoral-consortium",
  "special-session",
  "hackathon",
  "symposium",
  "other",
] as const;
export const coLocatedEventTypeSchema = z.enum(CO_LOCATED_EVENT_TYPES);
export type CoLocatedEventType = z.infer<typeof coLocatedEventTypeSchema>;

export const CO_LOCATED_EVENT_TYPE_LABELS: Record<CoLocatedEventType, string> = {
  workshop: "Workshop",
  tutorial: "Tutorial",
  "shared-task": "Shared task",
  competition: "Competition",
  challenge: "Challenge",
  "demo-track": "Demo track",
  "industry-track": "Industry track",
  "doctoral-consortium": "Doctoral consortium",
  "special-session": "Special session",
  hackathon: "Hackathon",
  symposium: "Symposium",
  other: "Other event",
};

/**
 * Distinguishes "the parent conference is accepting workshop proposals" from
 * "this specific workshop has been accepted/announced/opened submissions" —
 * see Part 1 "Proposal calls versus confirmed workshops". Never treat
 * "proposed" or "proposal-call-open" as a confirmed publication target.
 */
export const EVENT_LIFECYCLE_STATUSES = [
  "proposed",
  "proposal-call-open",
  "accepted",
  "officially-announced",
  "cfp-open",
  "submission-closed",
  "in-review",
  "notification-released",
  "camera-ready",
  "scheduled",
  "completed",
  "cancelled",
  "not-returning",
  "unverified",
] as const;
export const eventLifecycleStatusSchema = z.enum(EVENT_LIFECYCLE_STATUSES);
export type EventLifecycleStatus = z.infer<typeof eventLifecycleStatusSchema>;

export const EVENT_LIFECYCLE_LABELS: Record<EventLifecycleStatus, string> = {
  proposed: "Proposed (not yet accepted)",
  "proposal-call-open": "Parent conference is calling for proposals",
  accepted: "Accepted by the parent conference",
  "officially-announced": "Officially announced",
  "cfp-open": "Call for papers open",
  "submission-closed": "Submissions closed",
  "in-review": "In review",
  "notification-released": "Notifications released",
  "camera-ready": "Camera-ready in progress",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  "not-returning": "Not returning this cycle",
  unverified: "Unverified",
};

/** Lifecycle states that must never be presented as a confirmed publication target in the UI. */
export const UNCONFIRMED_EVENT_LIFECYCLE_STATUSES: EventLifecycleStatus[] = [
  "proposed",
  "proposal-call-open",
];

export const PROCEEDINGS_STATUSES = [
  "archival",
  "non-archival",
  "separate-proceedings",
  "parent-conference-proceedings",
  "no-proceedings",
  "unknown",
] as const;
export const proceedingsStatusSchema = z.enum(PROCEEDINGS_STATUSES);
export type ProceedingsStatus = z.infer<typeof proceedingsStatusSchema>;

export const eventProceedingsSchema = z.object({
  status: proceedingsStatusSchema,
  publisher: z.string().optional(),
  indexing: z.array(z.string()).default([]),
  doiExpected: z.boolean().optional(),
  sourceUrl: z.string().url().optional(),
  verifiedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type EventProceedings = z.infer<typeof eventProceedingsSchema>;

export const EVENT_MODES = ["physical", "online", "hybrid", "location-not-announced"] as const;
export const eventModeSchema = z.enum(EVENT_MODES);
export type EventMode = z.infer<typeof eventModeSchema>;

export const eventLocationOverrideSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  continent: continentSchema.optional(),
  venueName: z.string().optional(),
  mode: eventModeSchema.optional(),
});
export type EventLocationOverride = z.infer<typeof eventLocationOverrideSchema>;

/**
 * A workshop, tutorial, shared task, competition, or other event co-located
 * with a specific *edition* of a tracked conference. Reuses ConferenceDate,
 * VerificationStatus, Ranking, ResearchArea, PaperType, and AuditEntry from
 * above rather than duplicating those models.
 *
 * `ranking` is always independent — see Part 1 "Event ranking rule". Nothing
 * in this codebase may copy `parentConferenceTier` into `ranking.tier`.
 */
export const coLocatedEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  acronym: z.string().optional(),
  type: coLocatedEventTypeSchema,

  parentConferenceSeriesId: z.string(),
  parentConferenceEditionSlug: z.string(),
  editionYear: z.number(),

  lifecycleStatus: eventLifecycleStatusSchema,

  description: z.string().optional(),
  researchAreas: z.array(researchAreaSchema).default([]),
  keywords: z.array(z.string()).default([]),

  officialWebsiteUrl: z.string().url().optional(),
  callForPapersUrl: z.string().url().optional(),
  submissionSystemUrl: z.string().url().optional(),
  programmeUrl: z.string().url().optional(),
  parentProgrammeUrl: z.string().url().optional(),

  dates: z.array(conferenceDateSchema).default([]),

  paperTypes: z.array(paperTypeSchema).default([]),
  tracks: z.array(z.string()).default([]),
  pageLimit: z.string().optional(),
  submissionFormat: z.string().optional(),
  reviewModel: z.string().optional(),
  submissionLanguage: z.string().optional(),

  proceedings: eventProceedingsSchema.optional(),

  /**
   * Independent event ranking. Must default to Unclassified with no source
   * when no reliable independent ranking exists — never derived from the
   * parent conference's tier, publisher, indexing, or reputation.
   */
  ranking: rankingSchema,

  /** Present only when this event's location differs from its parent edition. */
  locationOverride: eventLocationOverrideSchema.optional(),

  verificationStatus: verificationStatusSchema,
  sourceUrls: z.array(z.string().url()).default([]),
  discoveredAt: z.string().optional(),
  lastScannedAt: z.string().optional(),
  lastVerifiedAt: z.string().optional(),
  notes: z.string().optional(),
  auditTrail: z.array(auditEntrySchema).default([]),
});
export type CoLocatedEvent = z.infer<typeof coLocatedEventSchema>;

export const coLocatedEventFileSchema = z.object({
  parentConferenceEditionSlug: z.string(),
  events: z.array(coLocatedEventSchema).min(1),
});
export type CoLocatedEventFile = z.infer<typeof coLocatedEventFileSchema>;
