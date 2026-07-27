import type {
  ConferenceDate,
  ConferenceEdition,
  DeadlineType,
  VerificationStatus,
} from "@/lib/schema";

export function makeDate(
  type: DeadlineType,
  startsAt: string,
  overrides: Partial<ConferenceDate> = {},
): ConferenceDate {
  return {
    id: `${type}-${startsAt}`,
    type,
    label: type,
    startsAt,
    timezone: "UTC",
    verificationStatus: (overrides.verificationStatus ?? "official") as VerificationStatus,
    ...overrides,
  };
}

export function makeEdition(overrides: Partial<ConferenceEdition> = {}): ConferenceEdition {
  return {
    name: "Example Conference",
    acronym: "EXC",
    slug: "exc-2026",
    editionYear: 2026,
    description: "An example conference used in tests.",
    seriesId: "exc",
    ranking: { tier: "A" },
    researchAreas: ["ml"],
    geographicCategory: "Europe",
    countryCode: "DE",
    country: "Germany",
    continent: "Europe",
    isOnline: false,
    isHybrid: false,
    locationVerificationStatus: "official",
    dates: [],
    tracks: ["Main Conference"],
    paperTypes: ["long-paper"],
    referenceDates: [],
    archiveHistory: [],
    auditTrail: [],
    ...overrides,
  };
}
