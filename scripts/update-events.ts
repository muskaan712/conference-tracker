/**
 * Merges freshly discovered associated-event candidates into src/data/events.
 * A discovered event is always written with lifecycleStatus "unverified",
 * verificationStatus "discovered", ranking.tier "Unclassified" (never
 * inherited from the parent conference), and an audit-trail entry with
 * reviewStatus "pending" — nothing is ever auto-promoted. This script only
 * *creates* new event proposals; it does not yet update fields on events
 * that already exist in the dataset (see docs for this limitation).
 *
 * Usage: npx tsx scripts/update-events.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  coLocatedEventFileSchema,
  conferenceSeriesFileSchema,
  type CoLocatedEvent,
  type CoLocatedEventFile,
  type ConferenceEdition,
} from "../src/lib/schema";
import { matchEditionForCandidate } from "./shared/edition-matching";
import { runEventDiscovery } from "./discover-events";
import type { DiscoveredEventCandidate } from "./shared/event-discovery";

const ROOT = path.join(__dirname, "..");
const CONFERENCES_DIR = path.join(ROOT, "src/data/conferences");
const EVENTS_DIR = path.join(ROOT, "src/data/events");
const REPORTS_DIR = path.join(ROOT, "reports");

function loadAllEditionsForMatching(): ConferenceEdition[] {
  if (!fs.existsSync(CONFERENCES_DIR)) return [];
  const files = fs.readdirSync(CONFERENCES_DIR).filter((f) => f.endsWith(".json"));
  const editions: ConferenceEdition[] = [];
  for (const file of files) {
    const parsed = conferenceSeriesFileSchema.parse(
      JSON.parse(fs.readFileSync(path.join(CONFERENCES_DIR, file), "utf-8")),
    );
    editions.push(...parsed.editions);
  }
  return editions;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadEventFile(parentSlug: string): { filePath: string; data: CoLocatedEventFile } {
  const filePath = path.join(EVENTS_DIR, `${parentSlug}.json`);
  if (fs.existsSync(filePath)) {
    return {
      filePath,
      data: coLocatedEventFileSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8"))),
    };
  }
  return { filePath, data: { parentConferenceEditionSlug: parentSlug, events: [] } };
}

function candidateToEvent(
  candidate: DiscoveredEventCandidate,
  parent: ConferenceEdition,
  slug: string,
  now: string,
): CoLocatedEvent {
  return {
    id: slug,
    slug,
    name: candidate.name,
    type: candidate.type,
    parentConferenceSeriesId: parent.seriesId,
    parentConferenceEditionSlug: parent.slug,
    editionYear: parent.editionYear,
    // Discovered from a link on a programme page only — this is deliberately
    // the most conservative lifecycle state until a human confirms it (see
    // Part 1 "Proposal calls versus confirmed workshops").
    lifecycleStatus: "unverified",
    researchAreas: [],
    keywords: [],
    officialWebsiteUrl: candidate.officialWebsiteUrl || undefined,
    dates: [],
    paperTypes: [],
    tracks: [],
    // Never inherited from the parent conference's ranking — see the Event
    // ranking rule in Part 1. Stays Unclassified until independently sourced.
    ranking: { tier: "Unclassified" },
    verificationStatus: "discovered",
    sourceUrls: [candidate.sourceUrl, candidate.officialWebsiteUrl].filter(
      (u, i, arr) => Boolean(u) && arr.indexOf(u) === i,
    ),
    discoveredAt: now,
    notes:
      "Automatically discovered from a workshop/tutorial programme page link. Not yet confirmed to exist as an accepted event — verify against its own official page before treating any date or ranking here as final.",
    auditTrail: [
      {
        id: `${slug}-${now}-created`,
        conferenceSlug: slug,
        field: "existence",
        previousValue: null,
        newValue: candidate.name,
        sourceUrl: candidate.sourceUrl,
        discoveredAt: now,
        verificationStatus: "discovered",
        updateMethod: "automated",
        confidence: candidate.confidence,
        reviewStatus: "pending",
      },
    ],
  };
}

async function main() {
  const editions = loadAllEditionsForMatching();
  const { candidates, failedSources, generatedAt } = await runEventDiscovery();

  const newByType = new Map<string, string[]>();
  const skippedNoParent: string[] = [];
  const touchedFiles = new Set<string>();
  const filesByParentSlug = new Map<string, { filePath: string; data: CoLocatedEventFile }>();

  for (const candidate of candidates) {
    const match = matchEditionForCandidate(editions, {
      seriesId: candidate.parentConferenceSeriesId,
      explicitEditionYear: candidate.editionYear,
    });
    if (!match.edition) {
      skippedNoParent.push(
        `${candidate.name} (${candidate.parentConferenceSeriesId} ${candidate.editionYear ?? "unknown year"}) — no matching parent edition; not written.`,
      );
      continue;
    }

    const parentSlug = match.edition.slug;
    if (!filesByParentSlug.has(parentSlug)) {
      filesByParentSlug.set(parentSlug, loadEventFile(parentSlug));
    }
    const entry = filesByParentSlug.get(parentSlug)!;

    const slug = `${parentSlug}-${slugify(candidate.name)}`;
    const alreadyExists = entry.data.events.some(
      (e) => e.slug === slug || e.officialWebsiteUrl === candidate.officialWebsiteUrl,
    );
    if (alreadyExists) continue;

    const event = candidateToEvent(candidate, match.edition, slug, generatedAt);
    entry.data.events.push(event);
    touchedFiles.add(entry.filePath);

    const bucket = `new${candidate.type.charAt(0).toUpperCase()}${candidate.type.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}s`;
    if (!newByType.has(bucket)) newByType.set(bucket, []);
    newByType
      .get(bucket)!
      .push(
        `${candidate.name} (${candidate.type}) at ${match.edition.acronym} ${match.edition.editionYear}`,
      );
  }

  for (const [parentSlug, entry] of filesByParentSlug) {
    if (!touchedFiles.has(entry.filePath)) continue;
    coLocatedEventFileSchema.parse(entry.data); // fail loudly rather than write invalid data
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
    fs.writeFileSync(entry.filePath, JSON.stringify(entry.data, null, 2) + "\n");
    console.log(`[update-events] Wrote ${entry.data.events.length} event(s) for ${parentSlug}`);
  }

  const newWorkshops = newByType.get("newWorkshops") ?? [];
  const newTutorials = newByType.get("newTutorials") ?? [];
  const newSharedTasks = newByType.get("newShared-Tasks") ?? newByType.get("newSharedTasks") ?? [];
  const newCompetitions = newByType.get("newCompetitions") ?? [];
  const otherNew = [...newByType.entries()]
    .filter(
      ([k]) =>
        ![
          "newWorkshops",
          "newTutorials",
          "newShared-Tasks",
          "newSharedTasks",
          "newCompetitions",
        ].includes(k),
    )
    .flatMap(([, v]) => v);

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportLines = [
    `# Automated associated-event update — ${generatedAt.slice(0, 10)}`,
    "",
    'Every discovered event below is written with lifecycle status "unverified" and an Unclassified, independently-assessed ranking. A human must confirm each one against its own official page before merging.',
    "",
  ];
  section(reportLines, "New workshops", newWorkshops);
  section(reportLines, "New tutorials", newTutorials);
  section(reportLines, "New shared tasks", newSharedTasks);
  section(reportLines, "New competitions", newCompetitions);
  section(reportLines, "Other new events", otherNew);
  section(reportLines, "Skipped (no matching parent conference edition)", skippedNoParent);
  section(reportLines, "Failed sources", failedSources);
  if (
    newWorkshops.length === 0 &&
    newTutorials.length === 0 &&
    newSharedTasks.length === 0 &&
    newCompetitions.length === 0 &&
    otherNew.length === 0
  ) {
    reportLines.push("_No new associated events were discovered this run._");
  }

  const reportPath = path.join(REPORTS_DIR, `event-update-report-${generatedAt.slice(0, 10)}.md`);
  fs.writeFileSync(reportPath, reportLines.join("\n") + "\n");

  console.log(
    `\nTouched ${touchedFiles.size} event data file(s); ${skippedNoParent.length} candidate(s) skipped for lacking a matching parent edition.`,
  );
  console.log(`Report written to ${path.relative(ROOT, reportPath)}`);
}

function section(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) return;
  lines.push(`## ${title}`, "");
  lines.push(...items.map((i) => `- ${i}`), "");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
