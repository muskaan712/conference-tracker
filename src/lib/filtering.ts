import type {
  ConferenceEdition,
  Continent,
  DeadlineType,
  GeographicCategory,
  PaperType,
  ResearchArea,
  Tier,
} from "./schema";
import { deriveConferenceStatus, type ConferenceStatus } from "./status";
import { relativeTimeTo, resolveDateInstant } from "./datetime";

export interface ConferenceFilters {
  keyword?: string;
  researchAreas?: ResearchArea[];
  tiers?: Tier[];
  geographicCategories?: GeographicCategory[];
  countryCodes?: string[];
  continents?: Continent[];
  onlineOnly?: boolean;
  hybridOnly?: boolean;
  statuses?: ConferenceStatus[];
  deadlineTypes?: DeadlineType[];
  years?: number[];
  months?: number[];
  paperTypes?: PaperType[];
  tracks?: string[];
  confirmedDatesOnly?: boolean;
  openDeadlinesOnly?: boolean;
  deadlineWithinDays?: number;
  announcedLocationOnly?: boolean;
  hasOfficialRanking?: boolean;
}

const OPEN_STATUSES: ConferenceStatus[] = [
  "Open",
  "Opening Soon",
  "Abstract Deadline Approaching",
  "Paper Deadline Approaching",
];

function matchesKeyword(edition: ConferenceEdition, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return (
    edition.name.toLowerCase().includes(q) ||
    edition.acronym.toLowerCase().includes(q) ||
    edition.description.toLowerCase().includes(q) ||
    (edition.city ?? "").toLowerCase().includes(q) ||
    (edition.country ?? "").toLowerCase().includes(q)
  );
}

function editionMonths(edition: ConferenceEdition): number[] {
  return edition.dates.map((d) => resolveDateInstant(d).getUTCMonth() + 1);
}

function editionYears(edition: ConferenceEdition): number[] {
  const years = new Set(edition.dates.map((d) => resolveDateInstant(d).getUTCFullYear()));
  years.add(edition.editionYear);
  return [...years];
}

function hasConfirmedDate(edition: ConferenceEdition): boolean {
  return edition.dates.some(
    (d) => d.verificationStatus === "official" || d.verificationStatus === "verified",
  );
}

function hasDeadlineWithinDays(edition: ConferenceEdition, days: number, now: Date): boolean {
  return edition.dates.some((d) => {
    if (d.verificationStatus === "previous-cycle") return false;
    const { isPassed, hoursRemaining } = relativeTimeTo(resolveDateInstant(d), now);
    return !isPassed && hoursRemaining <= days * 24;
  });
}

export function matchesFilters(
  edition: ConferenceEdition,
  filters: ConferenceFilters,
  now: Date = new Date(),
): boolean {
  if (filters.keyword && !matchesKeyword(edition, filters.keyword)) return false;
  if (
    filters.researchAreas?.length &&
    !filters.researchAreas.some((a) => edition.researchAreas.includes(a))
  )
    return false;
  if (filters.tiers?.length && !filters.tiers.includes(edition.ranking.tier)) return false;
  if (
    filters.geographicCategories?.length &&
    !filters.geographicCategories.includes(edition.geographicCategory)
  )
    return false;
  if (
    filters.countryCodes?.length &&
    (!edition.countryCode || !filters.countryCodes.includes(edition.countryCode))
  )
    return false;
  if (
    filters.continents?.length &&
    (!edition.continent || !filters.continents.includes(edition.continent))
  )
    return false;
  if (filters.onlineOnly && !edition.isOnline) return false;
  if (filters.hybridOnly && !edition.isHybrid) return false;
  if (filters.statuses?.length) {
    const status = deriveConferenceStatus(edition.dates, now);
    if (!filters.statuses.includes(status)) return false;
  }
  if (
    filters.deadlineTypes?.length &&
    !edition.dates.some((d) => filters.deadlineTypes!.includes(d.type))
  )
    return false;
  if (filters.years?.length && !editionYears(edition).some((y) => filters.years!.includes(y)))
    return false;
  if (filters.months?.length && !editionMonths(edition).some((m) => filters.months!.includes(m)))
    return false;
  if (filters.paperTypes?.length && !filters.paperTypes.some((t) => edition.paperTypes.includes(t)))
    return false;
  if (filters.tracks?.length && !filters.tracks.some((t) => edition.tracks.includes(t)))
    return false;
  if (filters.confirmedDatesOnly && !hasConfirmedDate(edition)) return false;
  if (filters.openDeadlinesOnly) {
    const status = deriveConferenceStatus(edition.dates, now);
    if (!OPEN_STATUSES.includes(status)) return false;
  }
  if (
    filters.deadlineWithinDays != null &&
    !hasDeadlineWithinDays(edition, filters.deadlineWithinDays, now)
  )
    return false;
  if (filters.announcedLocationOnly && edition.geographicCategory === "Location not announced")
    return false;
  if (
    filters.hasOfficialRanking &&
    (!edition.ranking.source || edition.ranking.tier === "Unclassified")
  )
    return false;
  return true;
}

export function applyFilters(
  editions: ConferenceEdition[],
  filters: ConferenceFilters,
  now: Date = new Date(),
): ConferenceEdition[] {
  return editions.filter((e) => matchesFilters(e, filters, now));
}

export function countActiveFilters(filters: ConferenceFilters): number {
  let count = 0;
  for (const [key, value] of Object.entries(filters)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) count += 1;
    } else if (typeof value === "boolean") {
      if (value) count += 1;
    } else if (typeof value === "string") {
      if (value.trim().length > 0) count += 1;
    } else {
      count += 1;
    }
    void key;
  }
  return count;
}
