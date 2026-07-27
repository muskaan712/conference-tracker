import type { DeadlineType, DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "./fetch-client";

export interface DiscoveredDateCandidate {
  type: DeadlineType;
  label: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  isAoE?: boolean;
  sourceUrl: string;
}

export interface DiscoveredEditionCandidate {
  seriesId: string;
  /**
   * Resolved per Part 3 "Edition matching": prefer a year explicit in the
   * source itself, then the discovery-sources.json registry's configured
   * `editionYear` for that source, then a year parsed out of the page's own
   * dates. Adapters must populate this whenever possible — update-
   * conferences.ts never falls back to "the newest on-disk edition".
   */
  editionYear?: number;
  city?: string;
  country?: string;
  countryCode?: string;
  venueName?: string;
  officialWebsiteUrl?: string;
  dates: DiscoveredDateCandidate[];
  sourceId: string;
  /** Reflects the discovery source's trustLevel; never auto-escalated to "official". */
  confidence: "high" | "medium" | "low";
}

export interface SourceAdapter {
  id: string;
  description: string;
  /** Whether this adapter knows how to handle the given source. */
  supports(source: DiscoverySource): boolean;
  run(source: DiscoverySource, client: FetchClient): Promise<DiscoveredEditionCandidate[]>;
}

export function confidenceForSource(source: DiscoverySource): "high" | "medium" | "low" {
  if (source.trustLevel === "official") return "high";
  if (source.trustLevel === "secondary") return "medium";
  return "low";
}
