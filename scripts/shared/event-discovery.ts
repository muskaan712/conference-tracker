import type { CoLocatedEventType, DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "./fetch-client";
import {
  classifyLink,
  extractLinks,
  extractYearFromText,
  findIndividualEventLinks,
} from "./parse-helpers";

export interface DiscoveredEventCandidate {
  parentConferenceSeriesId: string;
  /** Resolved the same way as DiscoveredEditionCandidate.editionYear — never a "newest edition" guess. */
  editionYear?: number;
  name: string;
  type: CoLocatedEventType;
  officialWebsiteUrl: string;
  sourceId: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
}

const TYPE_FROM_LINK_CLASSIFICATION: Partial<
  Record<ReturnType<typeof classifyLink>, CoLocatedEventType>
> = {
  tutorial: "tutorial",
  "shared-task": "shared-task",
  competition: "competition",
};

/**
 * Classifies a link's visible text into an associated-event type. Falls back
 * to keyword-sniffing "workshop"/"challenge"/"doctoral consortium" etc.
 * directly in the text, and to "other" (never a false-confident guess) when
 * nothing matches.
 */
export function classifyEventType(linkText: string): CoLocatedEventType {
  const classification = classifyLink({ href: "", text: linkText });
  const fromClassification = TYPE_FROM_LINK_CLASSIFICATION[classification];
  if (fromClassification) return fromClassification;
  if (/challenge/i.test(linkText)) return "challenge";
  if (/workshop/i.test(linkText)) return "workshop";
  if (/doctoral\s+consortium/i.test(linkText)) return "doctoral-consortium";
  if (/special\s+session/i.test(linkText)) return "special-session";
  if (/hackathon/i.test(linkText)) return "hackathon";
  if (/symposium/i.test(linkText)) return "symposium";
  if (/demo/i.test(linkText)) return "demo-track";
  if (/industry/i.test(linkText)) return "industry-track";
  return "other";
}

/**
 * Step 1-4 of the "Associated-event discovery" flow: scan a parent
 * conference's official workshop/tutorial programme page, extract
 * current-edition event links, classify each event's type, and resolve the
 * parent edition year. Does NOT follow individual event links to extract
 * their own CFP/date fields — that per-event field-level scan is a follow-up
 * (see docs/README "Automation" section for this limitation).
 */
export function parseEventLinksFromProgrammePage(
  html: string,
  pageUrl: string,
  source: DiscoverySource,
): Omit<DiscoveredEventCandidate, "confidence">[] {
  const links = extractLinks(html, pageUrl);
  const eventLinks = findIndividualEventLinks(links);
  const fallbackYear = source.editionYear ?? extractYearFromText(html);

  const seen = new Set<string>();
  const results: Omit<DiscoveredEventCandidate, "confidence">[] = [];
  for (const link of eventLinks) {
    const name = link.text.trim();
    if (!name || seen.has(link.href)) continue;
    seen.add(link.href);
    results.push({
      parentConferenceSeriesId: source.conferenceSeries ?? "unknown",
      editionYear: fallbackYear,
      name,
      type: classifyEventType(name),
      officialWebsiteUrl: link.href,
      sourceId: source.id,
      sourceUrl: pageUrl,
    });
  }
  return results;
}

export interface EventDiscoveryRunResult {
  candidates: DiscoveredEventCandidate[];
  failedSources: string[];
}

/**
 * Orchestrates event discovery across every enabled `workshop-programme`
 * source in the registry. Mirrors runDiscovery() in discover-conferences.ts
 * but for associated events.
 */
export async function discoverAssociatedEvents(
  sources: DiscoverySource[],
  client: FetchClient,
): Promise<EventDiscoveryRunResult> {
  const candidates: DiscoveredEventCandidate[] = [];
  const failedSources: string[] = [];

  for (const source of sources) {
    if (!source.enabled) continue;
    if (source.type !== "workshop-programme" && source.type !== "tutorial-programme") continue;
    try {
      const page = await client.fetchText(source.url);
      if (!page || page.status !== 200) continue;
      const parsed = parseEventLinksFromProgrammePage(page.body, source.url, source);
      const trustConfidence: DiscoveredEventCandidate["confidence"] =
        source.trustLevel === "official"
          ? "high"
          : source.trustLevel === "secondary"
            ? "medium"
            : "low";
      candidates.push(...parsed.map((c) => ({ ...c, confidence: trustConfidence })));
    } catch (error) {
      console.warn(`[event-discovery] Source "${source.id}" failed: ${(error as Error).message}`);
      failedSources.push(source.id);
    }
  }

  return { candidates, failedSources };
}
