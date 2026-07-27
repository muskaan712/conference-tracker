/**
 * Validates every conference data file and the discovery source registry
 * against their Zod schemas. Exits non-zero on any failure so CI and the
 * weekly automation workflow both fail loudly on bad data.
 *
 * Usage: npx tsx scripts/validate-conference-data.ts
 */
import fs from "node:fs";
import path from "node:path";
import { conferenceSeriesFileSchema, discoverySourceSchema } from "../src/lib/schema";

const ROOT = path.join(__dirname, "..");
const CONFERENCES_DIR = path.join(ROOT, "src/data/conferences");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");

let hasErrors = false;

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
validateDiscoverySources();

if (hasErrors) {
  console.error("\nValidation failed.");
  process.exit(1);
} else {
  console.log("\nAll conference data and discovery sources are valid.");
  process.exit(0);
}
