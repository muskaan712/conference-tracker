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

function confidenceForSource(source: DiscoverySource): "high" | "medium" | "low" {
  if (source.trustLevel === "official") return "high";
  if (source.trustLevel === "secondary") return "medium";
  return "low";
}

/**
 * Looks for schema.org `Event` JSON-LD on the source page — the structured,
 * machine-readable format we prefer over scraping HTML with CSS selectors.
 */
export const jsonLdEventAdapter: SourceAdapter = {
  id: "official-site-generic",
  description:
    "Extracts schema.org Event JSON-LD (name, startDate, endDate, location) from an official page.",
  supports(source) {
    return source.parser === "official-site-generic";
  },
  async run(source, client) {
    const page = await client.fetchText(source.url);
    if (!page || page.status !== 200) return [];

    const scripts = [
      ...page.body.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      ),
    ];
    const candidates: DiscoveredEditionCandidate[] = [];

    for (const match of scripts) {
      try {
        const json = JSON.parse(match[1].trim());
        const events = Array.isArray(json) ? json : [json];
        for (const event of events) {
          if (event["@type"] !== "Event") continue;
          const dates: DiscoveredDateCandidate[] = [];
          if (event.startDate) {
            dates.push({
              type: "conference-start",
              label: "Conference begins",
              startsAt: event.startDate,
              timezone: "UTC",
              sourceUrl: source.url,
            });
          }
          if (event.endDate) {
            dates.push({
              type: "conference-end",
              label: "Conference ends",
              startsAt: event.endDate,
              timezone: "UTC",
              sourceUrl: source.url,
            });
          }
          if (dates.length === 0) continue;
          candidates.push({
            seriesId: source.conferenceSeries ?? "unknown",
            city: event.location?.address?.addressLocality,
            country: event.location?.address?.addressCountry,
            venueName: event.location?.name,
            officialWebsiteUrl: event.url ?? source.url,
            dates,
            sourceId: source.id,
            confidence: confidenceForSource(source),
          });
        }
      } catch {
        // Malformed JSON-LD on the page; skip it rather than crash the run.
        continue;
      }
    }

    return candidates;
  },
};

/**
 * Default fallback for any source that doesn't have a registered parser yet.
 * Intentionally returns nothing — a human needs to write or configure a real
 * parser before this source can contribute candidate data.
 */
export const manualReviewFallbackAdapter: SourceAdapter = {
  id: "manual-review-fallback",
  description: "No automated parser configured; source is logged for manual follow-up only.",
  supports() {
    return true;
  },
  async run(source) {
    console.log(
      `[adapters] No parser configured for source "${source.id}" (${source.url}); skipping.`,
    );
    return [];
  },
};

export const ADAPTERS: SourceAdapter[] = [jsonLdEventAdapter];

export function adapterFor(source: DiscoverySource): SourceAdapter {
  return ADAPTERS.find((adapter) => adapter.supports(source)) ?? manualReviewFallbackAdapter;
}
