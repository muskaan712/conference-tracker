import type { ConferenceEdition } from "../../src/lib/schema";

export interface EditionMatchCandidate {
  seriesId: string;
  /** Priority 1: an explicit year the source itself asserts (e.g. from a URL path segment). */
  explicitEditionYear?: number;
  /** Priority 2: a specific edition slug the source names directly. */
  editionSlugHint?: string;
  /** Priority 3: a year found in the target page's own <meta>/<title> metadata. */
  metadataYear?: number;
  /** Priority 4: a year derived from a parsed conference-start/end date. */
  conferenceDateYear?: number;
  /** Priority 5: the edition year the discovery-sources.json registry entry was configured for. */
  sourceRegistryEditionYear?: number;
}

/**
 * Resolves the year to match against, following the exact priority order
 * from Part 3 "Edition matching": explicit year > slug (resolved by the
 * caller) > page metadata year > conference date year > source registry
 * configuration. Returns undefined rather than guessing when nothing is
 * available — callers must never substitute "the newest edition" here.
 */
export function resolveMatchYear(candidate: EditionMatchCandidate): number | undefined {
  return (
    candidate.explicitEditionYear ??
    candidate.metadataYear ??
    candidate.conferenceDateYear ??
    candidate.sourceRegistryEditionYear ??
    undefined
  );
}

export interface EditionMatchResult {
  edition?: ConferenceEdition;
  matchedBy: "slug" | "year" | "none";
  /** True when a year was resolved but no edition in the dataset has that (seriesId, year) pair — a likely new edition, not an error. */
  isPossibleNewEdition: boolean;
}

/**
 * Matches a discovery candidate to exactly one on-disk conference edition, or
 * explicitly reports no match. Never falls back to "whichever edition is
 * newest" — a candidate that can't be confidently matched must be queued for
 * manual review (see mergeSafeguards.ts) rather than silently applied to the
 * wrong edition.
 */
export function matchEditionForCandidate(
  editions: ConferenceEdition[],
  candidate: EditionMatchCandidate,
): EditionMatchResult {
  if (candidate.editionSlugHint) {
    const bySlug = editions.find((e) => e.slug === candidate.editionSlugHint);
    if (bySlug) return { edition: bySlug, matchedBy: "slug", isPossibleNewEdition: false };
  }

  const year = resolveMatchYear(candidate);
  if (year == null) {
    return { matchedBy: "none", isPossibleNewEdition: false };
  }

  const byYear = editions.find((e) => e.seriesId === candidate.seriesId && e.editionYear === year);
  if (byYear) {
    return { edition: byYear, matchedBy: "year", isPossibleNewEdition: false };
  }

  // A resolvable year with no matching on-disk edition is very likely a
  // genuinely new edition, not a data-entry mistake — flag it for the "new
  // edition proposal" path rather than treating it as an unmatched failure.
  return { matchedBy: "none", isPossibleNewEdition: true };
}
