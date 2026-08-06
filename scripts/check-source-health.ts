/**
 * Pings every discovery source (enabled or not) with a lightweight request and
 * records whether it responded. Never disables a source automatically — a
 * human decides what to do with a source flagged dead.
 *
 * Two distinct outputs, because they have different lifetimes:
 *
 * 1. `reports/source-health-<date>.md` — always written. In CI this is
 *    uploaded as a workflow artifact and is the durable record of the run.
 * 2. `lastCheckedAt` / `lastSuccessfulScan` / `isDead` in
 *    `discovery-sources.json` — written only when NOT in `--report-only`
 *    mode, i.e. when a human runs the script locally and can review and
 *    commit the result deliberately.
 *
 * The weekly workflow passes `--report-only` on purpose. Writing those
 * timestamps inside an ephemeral runner would be theatre: the weekly workflow
 * only opens a PR when `src/data/conferences` / `src/data/events` changed, so
 * a timestamp-only edit is thrown away when the runner exits — and on the runs
 * where data DID change, `git add src/data` would sweep unreviewed timestamp
 * churn into an otherwise focused data PR. Neither a timestamp-only PR nor a
 * direct push to `main` is acceptable, so CI keeps the results in the artifact
 * and the homepage's "Last successful scan" tile reads GitHub Actions run
 * metadata instead (see `src/lib/automation-status.ts`).
 *
 * Usage: npx tsx scripts/check-source-health.ts [--report-only]
 */
import fs from "node:fs";
import path from "node:path";
import { discoverySourceSchema } from "../src/lib/schema";
import { USER_AGENT } from "./shared/fetch-client";

const ROOT = path.join(__dirname, "..");
const DISCOVERY_SOURCES_PATH = path.join(ROOT, "src/data/discovery-sources.json");
const REPORTS_DIR = path.join(ROOT, "reports");
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

type HealthResult = { id: string; url: string; healthy: boolean };

function renderReport(results: HealthResult[], checkedAt: string, persisted: boolean): string {
  const dead = results.filter((r) => !r.healthy);
  const lines = [
    `# Discovery source health — ${checkedAt.slice(0, 10)}`,
    "",
    `Checked at: ${checkedAt}`,
    `Sources checked: ${results.length}`,
    `Unreachable: ${dead.length}`,
    "",
    persisted
      ? "`discovery-sources.json` was updated in place; review and commit it if the change looks right."
      : "Report-only run: `discovery-sources.json` was NOT modified. This report is the record of the run.",
    "",
    "| Source | URL | Status |",
    "| --- | --- | --- |",
    ...results.map((r) => `| ${r.id} | ${r.url} | ${r.healthy ? "OK" : "Unreachable"} |`),
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const reportOnly = process.argv.includes("--report-only");
  const sources = discoverySourceSchema
    .array()
    .parse(JSON.parse(fs.readFileSync(DISCOVERY_SOURCES_PATH, "utf-8")));
  const now = new Date().toISOString();
  const results: HealthResult[] = [];

  for (const source of sources) {
    const healthy = await checkOne(source.url);
    results.push({ id: source.id, url: source.url, healthy });
    source.lastCheckedAt = now;
    if (healthy) {
      source.lastSuccessfulScan = now;
      source.isDead = false;
      console.log(`✓ ${source.id} (${source.url})`);
    } else {
      source.isDead = true;
      console.warn(`✗ ${source.id} (${source.url}) — unreachable or returned an error status`);
    }
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `source-health-${now.slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, renderReport(results, now, !reportOnly));

  if (!reportOnly) {
    fs.writeFileSync(DISCOVERY_SOURCES_PATH, JSON.stringify(sources, null, 2) + "\n");
  }

  const deadCount = results.filter((r) => !r.healthy).length;
  console.log(`\nChecked ${sources.length} source(s); ${deadCount} flagged unreachable.`);
  console.log(`Report written to ${path.relative(ROOT, reportPath)}`);
  console.log(
    reportOnly
      ? "Report-only mode: discovery-sources.json left untouched."
      : "Updated discovery-sources.json in place — review and commit it deliberately.",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
