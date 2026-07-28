import { parse as parseYaml } from "yaml";
import type { DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "./fetch-client";
import {
  confidenceForSource,
  type DiscoveredDateCandidate,
  type DiscoveredEditionCandidate,
  type SourceAdapter,
} from "./discovery-types";
import { resolveSeriesIdFromTitle } from "./series-aliases";

/**
 * One entry in the AI Deadlines-style YAML feed
 * (github.com/paperswithcode/ai-deadlines, MIT licensed, `_data/conferences.yml`).
 * Every field is optional/untrusted input from a third-party community feed —
 * nothing here is assumed present, and nothing is trusted enough to become
 * `verificationStatus: "official"` (see confidenceForSource in adapters.ts,
 * which reads this source's registry `trustLevel: "discovery-only"` →
 * confidence "low", the same as any other unofficial candidate).
 */
interface AiDeadlinesEntry {
  title?: unknown;
  full_name?: unknown;
  year?: unknown;
  id?: unknown;
  link?: unknown;
  deadline?: unknown;
  abstract_deadline?: unknown;
  timezone?: unknown;
  place?: unknown;
}

export function isAoeTimezone(timezone: unknown): boolean {
  return typeof timezone === "string" && /utc\s*-?\s*12|anywhere\s+on\s+earth|\baoe\b/i.test(timezone);
}

/**
 * The feed stores deadlines as naive "YYYY-MM-DD HH:mm:ss" strings (no
 * offset) alongside a separate free-text `timezone` field. Splits that into
 * the `startsAt` wall-clock value this project's schema expects, dropping
 * entries that don't match the expected shape rather than guessing.
 */
export function parseFeedDateTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/);
  if (!match) return undefined;
  return `${match[1]}T${match[2]}:00`;
}

function buildDateCandidates(entry: AiDeadlinesEntry, sourceUrl: string): DiscoveredDateCandidate[] {
  const isAoE = isAoeTimezone(entry.timezone);
  const timezone = isAoE ? "Etc/GMT+12" : "UTC";
  const dates: DiscoveredDateCandidate[] = [];

  const fullPaper = parseFeedDateTime(entry.deadline);
  if (fullPaper) {
    dates.push({
      type: "full-paper",
      label: "Full paper submission deadline (discovered)",
      startsAt: fullPaper,
      timezone,
      isAoE,
      sourceUrl,
    });
  }

  const abstract = parseFeedDateTime(entry.abstract_deadline);
  if (abstract) {
    dates.push({
      type: "abstract",
      label: "Abstract submission deadline (discovered)",
      startsAt: abstract,
      timezone,
      isAoE,
      sourceUrl,
    });
  }

  return dates;
}

export function parseEntry(
  raw: unknown,
  source: DiscoverySource,
): DiscoveredEditionCandidate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entry = raw as AiDeadlinesEntry;

  const titleSource = typeof entry.title === "string" ? entry.title : undefined;
  if (!titleSource) return undefined;
  const seriesId = resolveSeriesIdFromTitle(titleSource);
  if (!seriesId) return undefined; // No known alias — dropped, never guessed.

  const editionYear = typeof entry.year === "number" ? entry.year : undefined;
  const sourceUrl = typeof entry.link === "string" ? entry.link : "";
  if (!sourceUrl) return undefined; // No citable evidence URL — drop rather than fabricate one.

  const dates = buildDateCandidates(entry, sourceUrl);
  if (dates.length === 0) return undefined;

  return {
    seriesId,
    editionYear,
    officialWebsiteUrl: sourceUrl,
    dates,
    sourceId: source.id,
    // Driven by the registry entry's trustLevel (expected to always be
    // "discovery-only" for this feed → "low"), never hardcoded, so this
    // stays correct if the registry configuration ever changes. Never
    // escalated downstream either — see merge-safeguards.ts, which forbids
    // a low-confidence candidate from becoming anything but "discovered".
    confidence: confidenceForSource(source),
  };
}

/**
 * Discovery-only adapter for the AI Deadlines-style machine-readable feed —
 * a single YAML file covering many conference series at once, in contrast
 * to every other adapter in this file which scans one official page per
 * source. Candidates are matched to a local series via `series-aliases.ts`
 * and an explicit edition year; anything that can't be confidently mapped
 * is dropped rather than guessed. Every candidate is produced at "low"
 * confidence and therefore can only ever land in `src/data/conferences/*`
 * as `verificationStatus: "discovered"`, pending human review — never
 * "official", and never able to overwrite an existing official value (see
 * evaluateFieldCandidate in merge-safeguards.ts).
 */
export const aiDeadlinesAdapter: SourceAdapter = {
  id: "ai-deadlines-yaml",
  description:
    "Parses the AI Deadlines-style community YAML feed (one file covering many conference series) into discovery-only candidates, matched to local series via an explicit alias table.",
  supports(source: DiscoverySource) {
    return source.parser === "ai-deadlines-yaml";
  },
  async run(source, client: FetchClient) {
    const page = await client.fetchText(source.url);
    if (!page || page.status !== 200) return [];

    let parsed: unknown;
    try {
      parsed = parseYaml(page.body);
    } catch (error) {
      console.warn(
        `[ai-deadlines-adapter] Malformed YAML from "${source.id}": ${(error as Error).message}`,
      );
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const candidates: DiscoveredEditionCandidate[] = [];
    for (const raw of parsed) {
      try {
        const candidate = parseEntry(raw, source);
        if (candidate) candidates.push(candidate);
      } catch {
        // One malformed entry must never abort the whole feed.
        continue;
      }
    }
    return candidates;
  },
};
