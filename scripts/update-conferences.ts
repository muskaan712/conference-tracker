/**
 * Merges freshly discovered candidates into the on-disk conference data,
 * *always* tagging new/changed dates as verificationStatus "discovered" and
 * recording an audit-trail entry with reviewStatus "pending" — nothing is
 * ever auto-promoted to "official" or "verified" by this script. The only
 * thing that changes trust level is a human reviewing the resulting PR.
 *
 * Usage: npx tsx scripts/update-conferences.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  conferenceSeriesFileSchema,
  type AuditEntry,
  type ConferenceEdition,
  type ConferenceSeriesFile,
} from "../src/lib/schema";
import { diffEditionFields } from "../src/lib/diff";
import { runDiscovery } from "./discover-conferences";
import type { DiscoveredEditionCandidate } from "./shared/adapters";
import { renderMarkdownReport, summarizeAuditEntries } from "./generate-update-report";

const ROOT = path.join(__dirname, "..");
const CONFERENCES_DIR = path.join(ROOT, "src/data/conferences");
const REPORTS_DIR = path.join(ROOT, "reports");

function loadSeriesFile(
  seriesId: string,
): { filePath: string; data: ConferenceSeriesFile } | undefined {
  const filePath = path.join(CONFERENCES_DIR, `${seriesId}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  const data = conferenceSeriesFileSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8")));
  return { filePath, data };
}

function mergeCandidateIntoEdition(
  edition: ConferenceEdition,
  candidate: DiscoveredEditionCandidate,
  now: string,
): { edition: ConferenceEdition; auditEntries: AuditEntry[] } {
  const before = structuredClone(edition);
  const next: ConferenceEdition = structuredClone(edition);

  for (const dateCandidate of candidate.dates) {
    const existingIndex = next.dates.findIndex((d) => d.type === dateCandidate.type);
    const discoveredDate = {
      id:
        existingIndex >= 0
          ? next.dates[existingIndex].id
          : `${edition.slug}-${dateCandidate.type}-discovered`,
      type: dateCandidate.type,
      label: dateCandidate.label,
      startsAt: dateCandidate.startsAt,
      endsAt: dateCandidate.endsAt,
      timezone: dateCandidate.timezone,
      isAoE: dateCandidate.isAoE,
      verificationStatus: "discovered" as const,
      sourceUrl: dateCandidate.sourceUrl,
      discoveredAt: now,
    };
    if (existingIndex >= 0) {
      if (next.dates[existingIndex].startsAt !== discoveredDate.startsAt) {
        next.dates[existingIndex] = { ...next.dates[existingIndex], ...discoveredDate };
      }
    } else {
      next.dates.push(discoveredDate);
    }
  }

  if (candidate.city && !next.city) next.city = candidate.city;
  if (candidate.country && !next.country) next.country = candidate.country;
  if (candidate.venueName && !next.venueName) next.venueName = candidate.venueName;

  next.lastScannedAt = now;

  const changes = diffEditionFields(before, next);
  const auditEntries: AuditEntry[] = changes.map((change, index) => ({
    id: `${edition.slug}-${now}-${index}`,
    conferenceSlug: edition.slug,
    field: change.field,
    previousValue: change.previousValue,
    newValue: change.newValue,
    sourceUrl: candidate.dates[0]?.sourceUrl,
    discoveredAt: now,
    verificationStatus: "discovered",
    updateMethod: "automated",
    confidence: candidate.confidence,
    reviewStatus: "pending",
  }));

  next.auditTrail = [...next.auditTrail, ...auditEntries];

  return { edition: next, auditEntries };
}

async function main() {
  const { candidates, failedSources, generatedAt } = await runDiscovery();
  const allAuditEntries: AuditEntry[] = [];
  const touchedFiles = new Set<string>();

  const bySeriesId = new Map<string, DiscoveredEditionCandidate[]>();
  for (const candidate of candidates) {
    if (!bySeriesId.has(candidate.seriesId)) bySeriesId.set(candidate.seriesId, []);
    bySeriesId.get(candidate.seriesId)!.push(candidate);
  }

  for (const [seriesId, seriesCandidates] of bySeriesId) {
    const loaded = loadSeriesFile(seriesId);
    if (!loaded) {
      console.warn(
        `[update] No local data file for series "${seriesId}"; skipping (would need a human to create it).`,
      );
      continue;
    }
    const { filePath, data } = loaded;
    let changed = false;

    const latestEdition = [...data.editions].sort((a, b) => b.editionYear - a.editionYear)[0];
    for (const candidate of seriesCandidates) {
      const { edition: mergedEdition, auditEntries } = mergeCandidateIntoEdition(
        latestEdition,
        candidate,
        generatedAt,
      );
      if (auditEntries.length === 0) continue;
      changed = true;
      allAuditEntries.push(...auditEntries);
      const idx = data.editions.findIndex((e) => e.slug === latestEdition.slug);
      data.editions[idx] = mergedEdition;
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
      touchedFiles.add(filePath);
    }
  }

  const summary = summarizeAuditEntries(allAuditEntries, failedSources);
  const report = renderMarkdownReport(summary, generatedAt);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `update-report-${generatedAt.slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, report + "\n");

  console.log(
    `\nTouched ${touchedFiles.size} data file(s), recorded ${allAuditEntries.length} audit entr${allAuditEntries.length === 1 ? "y" : "ies"}.`,
  );
  console.log(`Report written to ${path.relative(ROOT, reportPath)}`);
  if (touchedFiles.size === 0) {
    console.log("No changes to commit this run.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
