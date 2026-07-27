/**
 * Pings every discovery source (enabled or not) with a lightweight request
 * and records whether it responded, updating lastCheckedAt / lastSuccessfulScan
 * / isDead in discovery-sources.json. Never disables a source automatically —
 * a human decides what to do with a source flagged dead.
 *
 * Usage: npx tsx scripts/check-source-health.ts
 */
import fs from "node:fs";
import path from "node:path";
import { discoverySourceSchema } from "../src/lib/schema";
import { USER_AGENT } from "./shared/fetch-client";

const ROOT = path.join(__dirname, "..");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");
const TIMEOUT_MS = 10_000;

async function checkOne(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const sources = discoverySourceSchema
    .array()
    .parse(JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8")));
  const now = new Date().toISOString();
  let deadCount = 0;

  for (const source of sources) {
    const healthy = await checkOne(source.url);
    source.lastCheckedAt = now;
    if (healthy) {
      source.lastSuccessfulScan = now;
      source.isDead = false;
      console.log(`✓ ${source.id} (${source.url})`);
    } else {
      source.isDead = true;
      deadCount += 1;
      console.warn(`✗ ${source.id} (${source.url}) — unreachable or returned an error status`);
    }
  }

  fs.writeFileSync(DISCOVERY_SOURCES_PATH, JSON.stringify(sources, null, 2) + "\n");
  console.log(`\nChecked ${sources.length} source(s); ${deadCount} flagged unreachable.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
