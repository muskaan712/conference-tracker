/**
 * Runs event discovery against every enabled workshop/tutorial-programme
 * source and writes the raw candidates to a JSON report. Does NOT modify any
 * event data — see update-events.ts for the (still review-gated) merge step.
 * Mirrors discover-conferences.ts but for associated events.
 *
 * Usage: npx tsx scripts/discover-events.ts
 */
import fs from "node:fs";
import path from "node:path";
import { discoverySourceSchema } from "../src/lib/schema";
import { FetchClient } from "./shared/fetch-client";
import { discoverAssociatedEvents, type EventDiscoveryRunResult } from "./shared/event-discovery";

const ROOT = path.join(__dirname, "..");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");
const REPORTS_DIR = path.join(ROOT, "reports");

export async function runEventDiscovery(): Promise<
  EventDiscoveryRunResult & { generatedAt: string }
> {
  const sources = discoverySourceSchema
    .array()
    .parse(JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8")));
  const client = new FetchClient();
  const result = await discoverAssociatedEvents(sources, client);
  return { ...result, generatedAt: new Date().toISOString() };
}

async function main() {
  const result = await runEventDiscovery();
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const outPath = path.join(
    REPORTS_DIR,
    `discovered-events-${result.generatedAt.slice(0, 10)}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nDiscovered ${result.candidates.length} candidate associated event(s).`);
  if (result.failedSources.length > 0) {
    console.log(`Failed sources: ${result.failedSources.join(", ")}`);
  }
  console.log(`Report written to ${path.relative(ROOT, outPath)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
