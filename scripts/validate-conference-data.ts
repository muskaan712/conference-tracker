/**
 * Validates every conference data file and the discovery source registry
 * against their Zod schemas. Exits non-zero on any failure so CI and the
 * weekly automation workflow both fail loudly on bad data.
 *
 * Usage: npx tsx scripts/validate-conference-data.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  coLocatedEventFileSchema,
  conferenceSeriesFileSchema,
  discoverySourceSchema,
} from "../src/lib/schema";

const ROOT = path.join(__dirname, "..");
const CONFERENCES_DIR = path.join(ROOT, "src/data/conferences");
const EVENTS_DIR = path.join(ROOT, "src/data/events");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");

let hasErrors = false;
let knownEditionSlugs = new Set<string>();

function fail(message: string): void {
  hasErrors = true;
  console.error(`✗ ${message}`);
}

function validateConferenceFiles(): void {
  if (!fs.existsSync(CONFERENCES_DIR)) {
    fail(`Missing data directory: ${CONFERENCES_DIR}`);
    return;
  }

  const files = fs.readdirSync(CONFERENCES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    fail("No conference data files found.");
    return;
  }

  const seenSlugs = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(CONFERENCES_DIR, file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (error) {
      fail(`${file}: invalid JSON (${(error as Error).message})`);
      continue;
    }

    const result = conferenceSeriesFileSchema.safeParse(raw);
    if (!result.success) {
      fail(`${file}: schema validation failed`);
      for (const issue of result.error.issues) {
        console.error(`    - ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }

    const expectedSeriesId = path.basename(file, ".json");
    if (result.data.seriesId !== expectedSeriesId) {
      fail(
        `${file}: seriesId "${result.data.seriesId}" does not match filename "${expectedSeriesId}"`,
      );
    }

    for (const edition of result.data.editions) {
      if (seenSlugs.has(edition.slug)) {
        fail(`${file}: duplicate slug "${edition.slug}" (also in ${seenSlugs.get(edition.slug)})`);
      }
      seenSlugs.set(edition.slug, file);

      const dateIds = new Set<string>();
      for (const date of edition.dates) {
        if (dateIds.has(date.id))
          fail(`${file}: duplicate date id "${date.id}" in edition "${edition.slug}"`);
        dateIds.add(date.id);
        if (date.endsAt && date.endsAt < date.startsAt) {
          fail(`${file}: date "${date.id}" in "${edition.slug}" has endsAt before startsAt`);
        }
      }

      if (edition.ranking.tier !== "Unclassified" && !edition.ranking.source) {
        fail(
          `${file}: edition "${edition.slug}" has tier "${edition.ranking.tier}" but no ranking.source cited`,
        );
      }
    }

    console.log(
      `✓ ${file} (${result.data.editions.length} edition${result.data.editions.length === 1 ? "" : "s"})`,
    );
  }

  knownEditionSlugs = new Set(seenSlugs.keys());
}

function validateEventFiles(): void {
  if (!fs.existsSync(EVENTS_DIR)) {
    console.log("… src/data/events not present; skipping event validation (no events yet).");
    return;
  }

  const files = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith(".json"));
  const seenEventIds = new Map<string, string>();
  const seenEventSlugs = new Map<string, string>();

  for (const file of files) {
    const filePath = path.join(EVENTS_DIR, file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (error) {
      fail(`${file}: invalid JSON (${(error as Error).message})`);
      continue;
    }

    const result = coLocatedEventFileSchema.safeParse(raw);
    if (!result.success) {
      fail(`${file}: schema validation failed`);
      for (const issue of result.error.issues) {
        console.error(`    - ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }

    for (const event of result.data.events) {
      if (seenEventIds.has(event.id)) {
        fail(`${file}: duplicate event id "${event.id}" (also in ${seenEventIds.get(event.id)})`);
      }
      seenEventIds.set(event.id, file);

      if (seenEventSlugs.has(event.slug)) {
        fail(
          `${file}: duplicate event slug "${event.slug}" (also in ${seenEventSlugs.get(event.slug)})`,
        );
      }
      seenEventSlugs.set(event.slug, file);

      if (event.parentConferenceEditionSlug !== result.data.parentConferenceEditionSlug) {
        console.warn(
          `  ⚠ ${file}: event "${event.slug}" declares parentConferenceEditionSlug "${event.parentConferenceEditionSlug}", which differs from this file's declared parent "${result.data.parentConferenceEditionSlug}".`,
        );
      }

      if (!knownEditionSlugs.has(event.parentConferenceEditionSlug)) {
        fail(
          `${file}: event "${event.slug}" is orphaned — no conference edition with slug "${event.parentConferenceEditionSlug}" exists. Every associated event must reference a real conference edition.`,
        );
      }

      if (event.ranking.tier !== "Unclassified" && !event.ranking.source) {
        fail(
          `${file}: event "${event.slug}" has tier "${event.ranking.tier}" but no ranking.source cited — an event's ranking must never be inherited from its parent conference without an independent source.`,
        );
      }

      const dateIds = new Set<string>();
      for (const date of event.dates) {
        if (dateIds.has(date.id))
          fail(`${file}: duplicate date id "${date.id}" in event "${event.slug}"`);
        dateIds.add(date.id);
        if (date.endsAt && date.endsAt < date.startsAt) {
          fail(`${file}: date "${date.id}" in event "${event.slug}" has endsAt before startsAt`);
        }
      }
    }

    console.log(
      `✓ ${file} (${result.data.events.length} event${result.data.events.length === 1 ? "" : "s"})`,
    );
  }
}

function validateDiscoverySources(): void {
  if (!fs.existsSync(DISCOVERY_SOURCES_PATH)) {
    fail(`Missing discovery sources file: ${DISCOVERY_SOURCES_PATH}`);
    return;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8"));
  } catch (error) {
    fail(`discovery-sources.json: invalid JSON (${(error as Error).message})`);
    return;
  }
  const result = discoverySourceSchema.array().safeParse(raw);
  if (!result.success) {
    fail("discovery-sources.json: schema validation failed");
    for (const issue of result.error.issues) {
      console.error(`    - ${issue.path.join(".")}: ${issue.message}`);
    }
    return;
  }
  console.log(`✓ discovery-sources.json (${result.data.length} sources)`);
}

validateConferenceFiles();
validateEventFiles();
validateDiscoverySources();

if (hasErrors) {
  console.error("\nValidation failed.");
  process.exit(1);
} else {
  console.log("\nAll conference data and discovery sources are valid.");
  process.exit(0);
}
