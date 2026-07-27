import type { ConferenceEdition } from "./schema";
import { compareTiers } from "./tiers";
import { isEuropeanCountryCode } from "./geo";
import { resolveDateInstant } from "./datetime";

export const SORT_OPTIONS = [
  "tier",
  "nearest-submission",
  "nearest-notification",
  "conference-date",
  "alphabetical",
  "country",
  "europe-first",
  "outside-europe-first",
  "recently-verified",
  "recently-discovered",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  tier: "Tier (A* → Unclassified)",
  "nearest-submission": "Nearest submission deadline",
  "nearest-notification": "Nearest notification",
  "conference-date": "Conference date",
  alphabetical: "Alphabetical",
  country: "Country",
  "europe-first": "Europe first",
  "outside-europe-first": "Outside Europe first",
  "recently-verified": "Recently verified",
  "recently-discovered": "Recently discovered",
};

function nearestInstantOfTypes(edition: ConferenceEdition, types: string[], now: Date): number {
  const upcoming = edition.dates
    .filter((d) => types.includes(d.type) && d.verificationStatus !== "previous-cycle")
    .map((d) => resolveDateInstant(d).getTime())
    .filter((t) => t >= now.getTime());
  if (upcoming.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...upcoming);
}

function nearestConferenceInstant(edition: ConferenceEdition, now: Date): number {
  return nearestInstantOfTypes(edition, ["conference-start", "conference-end"], now);
}

function mostRecentVerifiedAt(edition: ConferenceEdition): number {
  const stamps = edition.dates
    .map((d) => d.verifiedAt)
    .concat(edition.lastVerifiedAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((v) => !Number.isNaN(v));
  return stamps.length ? Math.max(...stamps) : -Infinity;
}

function mostRecentDiscoveredAt(edition: ConferenceEdition): number {
  const stamps = edition.dates
    .map((d) => d.discoveredAt)
    .concat(edition.lastScannedAt)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((v) => !Number.isNaN(v));
  return stamps.length ? Math.max(...stamps) : -Infinity;
}

export function sortConferences(
  editions: ConferenceEdition[],
  sort: SortOption,
  now: Date = new Date(),
): ConferenceEdition[] {
  const items = [...editions];
  switch (sort) {
    case "tier":
      return items.sort(
        (a, b) => compareTiers(a.ranking.tier, b.ranking.tier) || a.name.localeCompare(b.name),
      );
    case "nearest-submission":
      return items.sort(
        (a, b) =>
          nearestInstantOfTypes(a, ["abstract", "full-paper", "arr-submission"], now) -
          nearestInstantOfTypes(b, ["abstract", "full-paper", "arr-submission"], now),
      );
    case "nearest-notification":
      return items.sort(
        (a, b) =>
          nearestInstantOfTypes(a, ["notification", "arr-commitment"], now) -
          nearestInstantOfTypes(b, ["notification", "arr-commitment"], now),
      );
    case "conference-date":
      return items.sort(
        (a, b) => nearestConferenceInstant(a, now) - nearestConferenceInstant(b, now),
      );
    case "alphabetical":
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case "country":
      return items.sort((a, b) => (a.country ?? "￿").localeCompare(b.country ?? "￿"));
    case "europe-first":
      return items.sort((a, b) => {
        const ae = isEuropeanCountryCode(a.countryCode) ? 0 : 1;
        const be = isEuropeanCountryCode(b.countryCode) ? 0 : 1;
        return ae - be || a.name.localeCompare(b.name);
      });
    case "outside-europe-first":
      return items.sort((a, b) => {
        const ae = isEuropeanCountryCode(a.countryCode) ? 1 : 0;
        const be = isEuropeanCountryCode(b.countryCode) ? 1 : 0;
        return ae - be || a.name.localeCompare(b.name);
      });
    case "recently-verified":
      return items.sort((a, b) => mostRecentVerifiedAt(b) - mostRecentVerifiedAt(a));
    case "recently-discovered":
      return items.sort((a, b) => mostRecentDiscoveredAt(b) - mostRecentDiscoveredAt(a));
    default:
      return items;
  }
}
