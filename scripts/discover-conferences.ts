/**
 * Runs the configured discovery adapters against every enabled source and
 * writes the raw candidates to a JSON report. Does NOT modify any conference
 * data — see update-conferences.ts for the (still review-gated) merge step.
 *
 * Usage: npx tsx scripts/discover-conferences.ts
 */
import fs from "node:fs";
import path from "node:path";
import { discoverySourceSchema } from "../src/lib/schema";
import { FetchClient } from "./shared/fetch-client";
import { adapterFor, type DiscoveredEditionCandidate } from "./shared/adapters";

const ROOT = path.join(__dirname, "..");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");
const REPORTS_DIR = path.join(ROOT, "reports");

export interface DiscoveryRunResult {
  candidates: DiscoveredEditionCandidate[];
  failedSources: string[];
  generatedAt: string;
}

export async function runDiscovery(): Promise<DiscoveryRunResult> {
  const sources = discoverySourceSchema
    .array()
    .parse(JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8")));
  const client = new FetchClient();
  const candidates: DiscoveredEditionCandidate[] = [];
  const failedSources: string[] = [];

  for (const source of sources) {
    if (!source.enabled) continue;
    const adapter = adapterFor(source);
    console.log(`[discover] ${source.id} → adapter "${adapter.id}"`);
    try {
      const result = await adapter.run(source, client);
      candidates.push(...result);
    } catch (error) {
      console.warn(`[discover] Source "${source.id}" failed: ${(error as Error).message}`);
      failedSources.push(source.id);
    }
  }

  return { candidates, failedSources, generatedAt: new Date().toISOString() };
}

async function main() {
  const result = await runDiscovery();
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const outPath = path.join(
    REPORTS_DIR,
    `discovered-candidates-${result.generatedAt.slice(0, 10)}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nDiscovered ${result.candidates.length} candidate record(s) from enabled sources.`);
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
