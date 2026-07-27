import type { DeadlineType, DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "./fetch-client";
import {
  detectAoE,
  extractYearFromText,
  parseDateText,
  parseDefinitionLists,
  parseFirstTable,
  parseTimezoneMention,
} from "./parse-helpers";

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
          const dateYear = event.startDate ? new Date(event.startDate).getUTCFullYear() : undefined;
          candidates.push({
            seriesId: source.conferenceSeries ?? "unknown",
            // Priority: registry-configured editionYear, then a year parsed
            // from the page's own conference date — never "newest on disk".
            editionYear: source.editionYear ?? (Number.isFinite(dateYear) ? dateYear : undefined),
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

const DEADLINE_LABEL_KEYWORDS: Array<[DeadlineType, RegExp]> = [
  ["abstract", /abstract/i],
  ["arr-commitment", /arr\s*commitment|commitment\s*deadline/i],
  ["arr-submission", /arr\s*submission/i],
  ["workshop-proposal", /workshop\s*proposal/i],
  ["workshop-paper", /workshop\s*(paper|submission)/i],
  ["camera-ready", /camera[\s-]?ready/i],
  ["early-registration", /early\s*(bird\s*)?registration/i],
  ["author-response", /author\s*response/i],
  ["rebuttal", /rebuttal/i],
  ["notification", /notification|decision/i],
  ["conference-start", /conference\s*(begins|starts)|start\s*date/i],
  ["conference-end", /conference\s*ends|end\s*date/i],
  ["full-paper", /(full\s*)?paper\s*(submission\s*)?deadline|submission\s*deadline/i],
];

/** Best-effort classification of a table/definition-list row label into a known DeadlineType. Never guesses beyond keyword matches. */
export function classifyDeadlineLabel(label: string): DeadlineType | undefined {
  for (const [type, pattern] of DEADLINE_LABEL_KEYWORDS) {
    if (pattern.test(label)) return type;
  }
  return undefined;
}

/**
 * Generic "important dates" page adapter: works on any page exposing an
 * HTML `<table>` or `<dl>` of label/date pairs (a very common layout for
 * academic CFP pages), without hardcoding one specific conference's markup.
 * Tested against synthetic fixtures modelled on that common layout — NOT
 * verified against any specific live conference site in this codebase.
 * Family-specific adapters (parsing a particular site's exact structure)
 * can be added alongside this one; none are claimed beyond what's here.
 */
export const importantDatesTableAdapter: SourceAdapter = {
  id: "important-dates-table",
  description:
    "Parses a generic HTML table or definition list of label/date pairs on an important-dates page.",
  supports(source) {
    return source.parser === "important-dates-table";
  },
  async run(source, client) {
    const page = await client.fetchText(source.url);
    if (!page || page.status !== 200) return [];

    const fallbackYear = source.editionYear ?? extractYearFromText(page.body);
    const rows = parseFirstTable(page.body);
    const pairs: Array<[string, string]> =
      rows.length > 0
        ? rows.filter((r) => r.length >= 2).map((r) => [r[0], r[1]])
        : parseDefinitionLists(page.body).map((e) => [e.term, e.definition]);

    const dates: DiscoveredDateCandidate[] = [];
    for (const [label, dateText] of pairs) {
      const type = classifyDeadlineLabel(label);
      if (!type) continue;
      const isAoE = detectAoE(dateText);
      const startsAt = parseDateText(dateText, fallbackYear);
      if (!startsAt) continue;
      dates.push({
        type,
        label: label.trim(),
        startsAt,
        timezone: parseTimezoneMention(dateText) ?? "UTC",
        isAoE,
        sourceUrl: source.url,
      });
    }

    if (dates.length === 0) return [];

    return [
      {
        seriesId: source.conferenceSeries ?? "unknown",
        editionYear: fallbackYear,
        officialWebsiteUrl: source.url,
        dates,
        sourceId: source.id,
        confidence: confidenceForSource(source),
      },
    ];
  },
};

export const ADAPTERS: SourceAdapter[] = [jsonLdEventAdapter, importantDatesTableAdapter];

export function adapterFor(source: DiscoverySource): SourceAdapter {
  return ADAPTERS.find((adapter) => adapter.supports(source)) ?? manualReviewFallbackAdapter;
}
