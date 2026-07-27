import fs from "node:fs";
import path from "node:path";
import {
  conferenceSeriesFileSchema,
  discoverySourceSchema,
  type AuditEntry,
  type ConferenceEdition,
  type DiscoverySource,
} from "./schema";
import { deriveConferenceStatus } from "./status";
import { relativeTimeTo, resolveDateInstant } from "./datetime";

const DATA_DIR = path.join(process.cwd(), "src/data/conferences");
const DISCOVERY_SOURCES_PATH = path.join(process.cwd(), "src/data/discovery-sources.json");

let cachedEditions: ConferenceEdition[] | null = null;
let cachedSources: DiscoverySource[] | null = null;

export function loadAllEditions(): ConferenceEdition[] {
  if (cachedEditions) return cachedEditions;
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const editions: ConferenceEdition[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8")) as unknown;
    const parsed = conferenceSeriesFileSchema.parse(raw);
    editions.push(...parsed.editions);
  }
  editions.sort((a, b) => a.name.localeCompare(b.name) || a.editionYear - b.editionYear);
  cachedEditions = editions;
  return editions;
}

export function loadDiscoverySources(): DiscoverySource[] {
  if (cachedSources) return cachedSources;
  const raw = JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8")) as unknown;
  cachedSources = discoverySourceSchema.array().parse(raw);
  return cachedSources;
}

export function getAllEditions(): ConferenceEdition[] {
  return loadAllEditions();
}

export function getEditionBySlug(slug: string): ConferenceEdition | undefined {
  return loadAllEditions().find((e) => e.slug === slug);
}

export function getEditionsBySeriesId(seriesId: string): ConferenceEdition[] {
  return loadAllEditions()
    .filter((e) => e.seriesId === seriesId)
    .sort((a, b) => b.editionYear - a.editionYear);
}

export interface AuditEntryWithConference extends AuditEntry {
  conferenceName: string;
  conferenceAcronym: string;
  conferenceSlugResolved: string;
}

export function getAllAuditEntries(): AuditEntryWithConference[] {
  const editions = loadAllEditions();
  const entries: AuditEntryWithConference[] = [];
  for (const edition of editions) {
    for (const audit of edition.auditTrail) {
      entries.push({
        ...audit,
        conferenceName: edition.name,
        conferenceAcronym: edition.acronym,
        conferenceSlugResolved: edition.slug,
      });
    }
  }
  return entries.sort(
    (a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime(),
  );
}

export interface TrackerStats {
  conferenceCount: number;
  seriesCount: number;
  upcomingDeadlineCount: number;
  lastTrackerUpdate?: string;
  lastAutomatedScan?: string;
}

export function getTrackerStats(now: Date = new Date()): TrackerStats {
  const editions = loadAllEditions();
  const seriesIds = new Set(editions.map((e) => e.seriesId));

  let upcomingDeadlineCount = 0;
  let lastTrackerUpdate: string | undefined;
  let lastAutomatedScan: string | undefined;

  for (const edition of editions) {
    for (const date of edition.dates) {
      if (date.verificationStatus === "previous-cycle") continue;
      const { isPassed } = relativeTimeTo(resolveDateInstant(date), now);
      if (!isPassed) upcomingDeadlineCount += 1;
      if (date.verifiedAt && (!lastTrackerUpdate || date.verifiedAt > lastTrackerUpdate)) {
        lastTrackerUpdate = date.verifiedAt;
      }
    }
    if (
      edition.lastVerifiedAt &&
      (!lastTrackerUpdate || edition.lastVerifiedAt > lastTrackerUpdate)
    ) {
      lastTrackerUpdate = edition.lastVerifiedAt;
    }
    if (
      edition.lastScannedAt &&
      (!lastAutomatedScan || edition.lastScannedAt > lastAutomatedScan)
    ) {
      lastAutomatedScan = edition.lastScannedAt;
    }
  }

  return {
    conferenceCount: editions.length,
    seriesCount: seriesIds.size,
    upcomingDeadlineCount,
    lastTrackerUpdate,
    lastAutomatedScan,
  };
}

export interface UpcomingDeadlineEntry {
  edition: ConferenceEdition;
  date: ConferenceEdition["dates"][number];
  daysRemaining: number;
}

export function getUpcomingDeadlines(
  now: Date = new Date(),
  limit?: number,
): UpcomingDeadlineEntry[] {
  const editions = loadAllEditions();
  const entries: UpcomingDeadlineEntry[] = [];
  for (const edition of editions) {
    for (const date of edition.dates) {
      if (date.verificationStatus === "previous-cycle") continue;
      const { isPassed, daysRemaining } = relativeTimeTo(resolveDateInstant(date), now);
      if (!isPassed) entries.push({ edition, date, daysRemaining });
    }
  }
  entries.sort(
    (a, b) =>
      resolveDateInstant(a.date).getTime() - resolveDateInstant(b.date).getTime(),
  );
  return limit ? entries.slice(0, limit) : entries;
}

export function getEditionStatus(edition: ConferenceEdition, now: Date = new Date()) {
  return deriveConferenceStatus(edition.dates, now);
}
