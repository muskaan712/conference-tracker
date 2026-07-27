import type { DiscoverySource } from "../../src/lib/schema";
import { classifyDeadlineLabel, detectAoE, extractYearFromText, parseDateText } from "./parse-helpers";
import {
  confidenceForSource,
  type DiscoveredDateCandidate,
  type SourceAdapter,
} from "./discovery-types";

/**
 * The subset of OpenReview API v2's `GET /groups?id=...` response this
 * adapter reads. Every OpenReview "content" field is wrapped as
 * `{ value: ... }` (confirmed against the live API for
 * `ICLR.cc/2026/Conference`) — a quirk of OpenReview's Edit-based content
 * model, not something this project controls.
 */
interface OpenReviewGroupsResponse {
  groups?: Array<{
    id?: string;
    content?: {
      date?: { value?: unknown };
      start_date?: { value?: unknown };
      website?: { value?: unknown };
    };
  }>;
}

/**
 * OpenReview venues commonly publish their whole submission timeline as one
 * free-text string on the venue group, e.g. "Submission Start: Sep 01 2025
 * 11:59AM UTC-0, Abstract Registration: Sep 20 2025 11:59AM UTC-0,
 * Submission Deadline: Sep 25 2025 11:59AM UTC-0" — comma-separated
 * "Label: date" segments. Splits and classifies each segment independently;
 * a segment whose label doesn't match a known deadline type, or whose date
 * text doesn't parse, is dropped rather than guessed.
 */
function parseAggregatedDateString(
  text: string,
  fallbackYear: number | undefined,
  sourceUrl: string,
): DiscoveredDateCandidate[] {
  const dates: DiscoveredDateCandidate[] = [];
  for (const segment of text.split(",")) {
    const separatorIndex = segment.indexOf(":");
    if (separatorIndex <= 0) continue;
    const label = segment.slice(0, separatorIndex).trim();
    const dateText = segment.slice(separatorIndex + 1).trim();
    const type = classifyDeadlineLabel(label);
    if (!type) continue;
    const startsAt = parseDateText(dateText, fallbackYear);
    if (!startsAt) continue;
    dates.push({
      type,
      label: `${label} (OpenReview)`,
      startsAt,
      // OpenReview commonly states "UTC-0"/"UTC+X" offsets rather than AoE;
      // this project doesn't yet resolve arbitrary UTC±N offsets to an IANA
      // zone, so — deliberately conservative — it's recorded as UTC with
      // the offset preserved only in the visible label, not silently
      // dropped or misrepresented as AoE.
      timezone: "UTC",
      isAoE: detectAoE(dateText),
      sourceUrl,
    });
  }
  return dates;
}

/**
 * Discovery-only adapter for an OpenReview venue's public group metadata —
 * stable, publicly accessible JSON (no auth required for a public venue
 * group), used by NeurIPS/ICLR-family venues among others. `source.url`
 * must be the venue's `GET /groups?id=...` API URL directly (e.g.
 * `https://api2.openreview.net/groups?id=ICLR.cc/2026/Conference`) — this
 * adapter does not resolve a venue ID from a conference name.
 */
export const openReviewVenueAdapter: SourceAdapter = {
  id: "openreview-venue-group",
  description:
    "Reads an OpenReview venue's public group metadata (content.date / content.start_date) for submission timeline dates.",
  supports(source: DiscoverySource) {
    return source.parser === "openreview-venue-group";
  },
  async run(source, client) {
    const page = await client.fetchText(source.url);
    if (!page || page.status !== 200) return [];

    let parsed: OpenReviewGroupsResponse;
    try {
      parsed = JSON.parse(page.body);
    } catch (error) {
      console.warn(
        `[openreview-adapter] Malformed JSON from "${source.id}": ${(error as Error).message}`,
      );
      return [];
    }

    const group = parsed.groups?.[0];
    const dateValue = group?.content?.date?.value;
    if (typeof dateValue !== "string") return [];

    const fallbackYear = source.editionYear ?? extractYearFromText(dateValue) ?? extractYearFromText(page.body);
    const dates = parseAggregatedDateString(dateValue, fallbackYear, source.url);
    if (dates.length === 0) return [];

    const websiteValue = group?.content?.website?.value;

    return [
      {
        seriesId: source.conferenceSeries ?? "unknown",
        editionYear: fallbackYear,
        officialWebsiteUrl: typeof websiteValue === "string" ? websiteValue : source.url,
        dates,
        sourceId: source.id,
        confidence: confidenceForSource(source),
      },
    ];
  },
};
