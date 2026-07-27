import type { CoLocatedEvent, ConferenceEdition } from "./schema";
import { compareTiers } from "./tiers";
import { resolveDateInstant } from "./datetime";
import { parentTierFor } from "./event-filtering";

export const EVENT_SORT_OPTIONS = [
  "nearest-submission",
  "name",
  "parent-conference",
  "parent-tier",
  "event-tier",
  "event-type",
  "event-date",
  "recently-verified",
  "recently-discovered",
] as const;
export type EventSortOption = (typeof EVENT_SORT_OPTIONS)[number];

export const EVENT_SORT_LABELS: Record<EventSortOption, string> = {
  "nearest-submission": "Nearest submission deadline",
  name: "Event name",
  "parent-conference": "Parent conference",
  "parent-tier": "Parent conference tier",
  "event-tier": "Event tier",
  "event-type": "Event type",
  "event-date": "Event date",
  "recently-verified": "Recently verified",
  "recently-discovered": "Recently discovered",
};

const SUBMISSION_TYPES = [
  "workshop-abstract",
  "workshop-paper",
  "tutorial-proposal",
  "tutorial-material",
  "shared-task-registration",
  "shared-task-submission",
  "competition-registration",
  "competition-submission",
  "challenge-deadline",
  "doctoral-consortium-deadline",
];

function nearestSubmissionInstant(event: CoLocatedEvent, now: Date): number {
  const upcoming = event.dates
    .filter((d) => SUBMISSION_TYPES.includes(d.type) && d.verificationStatus !== "previous-cycle")
    .map((d) => resolveDateInstant(d).getTime())
    .filter((t) => t >= now.getTime());
  return upcoming.length ? Math.min(...upcoming) : Number.POSITIVE_INFINITY;
}

function nearestEventInstant(event: CoLocatedEvent, now: Date): number {
  const upcoming = event.dates
    .filter((d) => ["event-start", "event-end"].includes(d.type))
    .map((d) => resolveDateInstant(d).getTime())
    .filter((t) => t >= now.getTime());
  return upcoming.length ? Math.min(...upcoming) : Number.POSITIVE_INFINITY;
}

function mostRecentVerifiedAt(event: CoLocatedEvent): number {
  const stamps = event.dates
    .map((d) => d.verifiedAt)
    .concat(event.lastVerifiedAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((v) => !Number.isNaN(v));
  return stamps.length ? Math.max(...stamps) : -Infinity;
}

function mostRecentDiscoveredAt(event: CoLocatedEvent): number {
  const stamps = event.dates
    .map((d) => d.discoveredAt)
    .concat(event.discoveredAt, event.lastScannedAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((v) => !Number.isNaN(v));
  return stamps.length ? Math.max(...stamps) : -Infinity;
}

function parentName(event: CoLocatedEvent, editions: ConferenceEdition[]): string {
  return (
    editions.find((e) => e.slug === event.parentConferenceEditionSlug)?.name ??
    event.parentConferenceSeriesId
  );
}

export function sortEvents(
  events: CoLocatedEvent[],
  sort: EventSortOption,
  now: Date = new Date(),
  editions: ConferenceEdition[] = [],
): CoLocatedEvent[] {
  const items = [...events];
  switch (sort) {
    case "nearest-submission":
      return items.sort(
        (a, b) => nearestSubmissionInstant(a, now) - nearestSubmissionInstant(b, now),
      );
    case "name":
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case "parent-conference":
      return items.sort((a, b) => parentName(a, editions).localeCompare(parentName(b, editions)));
    case "parent-tier":
      return items.sort((a, b) => {
        const at = parentTierFor(a, editions);
        const bt = parentTierFor(b, editions);
        if (!at && !bt) return a.name.localeCompare(b.name);
        if (!at) return 1;
        if (!bt) return -1;
        return compareTiers(at, bt) || a.name.localeCompare(b.name);
      });
    case "event-tier":
      return items.sort(
        (a, b) => compareTiers(a.ranking.tier, b.ranking.tier) || a.name.localeCompare(b.name),
      );
    case "event-type":
      return items.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    case "event-date":
      return items.sort((a, b) => nearestEventInstant(a, now) - nearestEventInstant(b, now));
    case "recently-verified":
      return items.sort((a, b) => mostRecentVerifiedAt(b) - mostRecentVerifiedAt(a));
    case "recently-discovered":
      return items.sort((a, b) => mostRecentDiscoveredAt(b) - mostRecentDiscoveredAt(a));
    default:
      return items;
  }
}
