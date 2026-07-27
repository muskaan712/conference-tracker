import type {
  CoLocatedEvent,
  CoLocatedEventType,
  ConferenceEdition,
  DeadlineType,
  ResearchArea,
  Tier,
} from "./schema";
import { deriveConferenceStatus, type ConferenceStatus } from "./status";
import { resolveDateInstant } from "./datetime";
import { resolveEventLocation } from "./event-location";

/**
 * Every function here is pure and filesystem-free — callers (both Server and
 * Client Components) pass in the `editions` array they already have (e.g.
 * from a page's `getAllEditions()` call) rather than this module fetching it
 * itself via `@/lib/conferences`, which would pull `node:fs` into any Client
 * Component bundle that imports this file (see event-directory.tsx,
 * resubmission-planner.tsx).
 */
function findParentEdition(
  event: CoLocatedEvent,
  editions: ConferenceEdition[],
): ConferenceEdition | undefined {
  return editions.find((e) => e.slug === event.parentConferenceEditionSlug);
}

export interface EventFilters {
  keyword?: string;
  eventTypes?: CoLocatedEventType[];
  parentConferenceSeriesIds?: string[];
  parentTiers?: Tier[];
  eventTiers?: Tier[];
  researchAreas?: ResearchArea[];
  europeOnly?: boolean;
  outsideEuropeOnly?: boolean;
  countryCodes?: string[];
  onlineOnly?: boolean;
  hybridOnly?: boolean;
  archivalOnly?: boolean;
  nonArchivalOnly?: boolean;
  unknownProceedingsOnly?: boolean;
  confirmedDatesOnly?: boolean;
  openSubmissionsOnly?: boolean;
  years?: number[];
  months?: number[];
  deadlineTypes?: DeadlineType[];
}

const OPEN_STATUSES: ConferenceStatus[] = [
  "Open",
  "Opening Soon",
  "Abstract Deadline Approaching",
  "Paper Deadline Approaching",
];

function matchesKeyword(event: CoLocatedEvent, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return (
    event.name.toLowerCase().includes(q) ||
    (event.acronym ?? "").toLowerCase().includes(q) ||
    (event.description ?? "").toLowerCase().includes(q) ||
    (event.keywords ?? []).some((k) => k.toLowerCase().includes(q))
  );
}

function eventYears(event: CoLocatedEvent): number[] {
  const years = new Set(event.dates.map((d) => resolveDateInstant(d).getUTCFullYear()));
  years.add(event.editionYear);
  return [...years];
}

function eventMonths(event: CoLocatedEvent): number[] {
  return event.dates.map((d) => resolveDateInstant(d).getUTCMonth() + 1);
}

function hasConfirmedDate(event: CoLocatedEvent): boolean {
  return event.dates.some(
    (d) => d.verificationStatus === "official" || d.verificationStatus === "verified",
  );
}

/** Parent conference edition's ranking tier, kept clearly separate from the event's own tier. */
export function parentTierFor(
  event: CoLocatedEvent,
  editions: ConferenceEdition[],
): Tier | undefined {
  return findParentEdition(event, editions)?.ranking.tier;
}

export function matchesEventFilters(
  event: CoLocatedEvent,
  filters: EventFilters,
  now: Date = new Date(),
  editions: ConferenceEdition[] = [],
): boolean {
  if (filters.keyword && !matchesKeyword(event, filters.keyword)) return false;
  if (filters.eventTypes?.length && !filters.eventTypes.includes(event.type)) return false;
  if (
    filters.parentConferenceSeriesIds?.length &&
    !filters.parentConferenceSeriesIds.includes(event.parentConferenceSeriesId)
  )
    return false;
  if (
    filters.researchAreas?.length &&
    !filters.researchAreas.some((a) => event.researchAreas.includes(a))
  )
    return false;
  if (filters.eventTiers?.length && !filters.eventTiers.includes(event.ranking.tier)) return false;
  if (filters.parentTiers?.length) {
    const parentTier = parentTierFor(event, editions);
    if (!parentTier || !filters.parentTiers.includes(parentTier)) return false;
  }

  const location = resolveEventLocation(event, findParentEdition(event, editions));
  if (filters.europeOnly || filters.outsideEuropeOnly) {
    const isEurope = location.continent === "Europe";
    if (filters.europeOnly && !isEurope) return false;
    if (filters.outsideEuropeOnly && isEurope) return false;
  }
  if (
    filters.countryCodes?.length &&
    (!location.countryCode || !filters.countryCodes.includes(location.countryCode))
  )
    return false;
  if (filters.onlineOnly && location.mode !== "online") return false;
  if (filters.hybridOnly && location.mode !== "hybrid") return false;

  if (filters.archivalOnly && event.proceedings?.status !== "archival") return false;
  if (
    filters.nonArchivalOnly &&
    !["non-archival", "no-proceedings"].includes(event.proceedings?.status ?? "")
  )
    return false;
  if (filters.unknownProceedingsOnly && (event.proceedings?.status ?? "unknown") !== "unknown")
    return false;

  if (filters.confirmedDatesOnly && !hasConfirmedDate(event)) return false;
  if (filters.openSubmissionsOnly) {
    const status = deriveConferenceStatus(event.dates, now);
    if (!OPEN_STATUSES.includes(status)) return false;
  }
  if (filters.years?.length && !eventYears(event).some((y) => filters.years!.includes(y)))
    return false;
  if (filters.months?.length && !eventMonths(event).some((m) => filters.months!.includes(m)))
    return false;
  if (
    filters.deadlineTypes?.length &&
    !event.dates.some((d) => filters.deadlineTypes!.includes(d.type))
  )
    return false;

  return true;
}

export function applyEventFilters(
  events: CoLocatedEvent[],
  filters: EventFilters,
  now: Date = new Date(),
  editions: ConferenceEdition[] = [],
): CoLocatedEvent[] {
  return events.filter((e) => matchesEventFilters(e, filters, now, editions));
}

export function countActiveEventFilters(filters: EventFilters): number {
  let count = 0;
  for (const value of Object.values(filters)) {
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
  }
  return count;
}

export { OPEN_STATUSES as EVENT_OPEN_STATUSES };
