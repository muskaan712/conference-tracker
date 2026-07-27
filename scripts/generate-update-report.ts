import type { AuditEntry } from "../src/lib/schema";

export interface ReportSummary {
  newConferences: string[];
  newEditions: string[];
  changedDeadlines: AuditEntry[];
  locationChanges: AuditEntry[];
  rankingChanges: AuditEntry[];
  verificationWarnings: AuditEntry[];
  parsingFailures: string[];
  needsManualReview: AuditEntry[];
}

export function summarizeAuditEntries(
  entries: AuditEntry[],
  parsingFailures: string[] = [],
): ReportSummary {
  return {
    newConferences: [],
    newEditions: [],
    changedDeadlines: entries.filter((e) => e.field.startsWith("dates.")),
    locationChanges: entries.filter((e) =>
      ["city", "country", "countryCode", "venueName", "geographicCategory"].includes(e.field),
    ),
    rankingChanges: entries.filter((e) => e.field === "ranking.tier"),
    verificationWarnings: entries.filter(
      (e) => e.verificationStatus === "conflicting" || e.verificationStatus === "unverified",
    ),
    parsingFailures,
    needsManualReview: entries.filter(
      (e) => e.reviewStatus === "pending" && e.confidence !== "high",
    ),
  };
}

/** Renders a human-readable Markdown report, suitable as a PR body or a saved artifact. */
export function renderMarkdownReport(summary: ReportSummary, generatedAt: string): string {
  const lines: string[] = [];
  lines.push(`# Automated conference data update — ${generatedAt.slice(0, 10)}`);
  lines.push("");
  lines.push(
    "This report was generated automatically. Every change below still needs a human to check the cited source before merging.",
  );
  lines.push("");

  section(
    lines,
    "New conferences",
    summary.newConferences.map((s) => `- ${s}`),
  );
  section(
    lines,
    "New editions",
    summary.newEditions.map((s) => `- ${s}`),
  );
  section(
    lines,
    "Changed deadlines",
    summary.changedDeadlines.map((e) => auditLine(e)),
  );
  section(
    lines,
    "Location changes",
    summary.locationChanges.map((e) => auditLine(e)),
  );
  section(
    lines,
    "Ranking changes",
    summary.rankingChanges.map((e) => auditLine(e)),
  );
  section(
    lines,
    "Verification warnings",
    summary.verificationWarnings.map((e) => auditLine(e)),
  );
  section(
    lines,
    "Parsing failures",
    summary.parsingFailures.map((s) => `- ${s}`),
  );
  section(
    lines,
    "Needs manual review",
    summary.needsManualReview.map((e) => auditLine(e)),
  );

  if (
    summary.newConferences.length === 0 &&
    summary.newEditions.length === 0 &&
    summary.changedDeadlines.length === 0 &&
    summary.locationChanges.length === 0 &&
    summary.rankingChanges.length === 0
  ) {
    lines.push("_No changes were discovered this run._");
  }

  return lines.join("\n");
}

function section(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) return;
  lines.push(`## ${title}`, "");
  lines.push(...items, "");
}

function auditLine(entry: AuditEntry): string {
  const source = entry.sourceUrl ? ` ([source](${entry.sourceUrl}))` : "";
  return `- **${entry.conferenceSlug}** — \`${entry.field}\`: ${entry.previousValue ?? "(none)"} → ${entry.newValue ?? "(removed)"} — ${entry.verificationStatus}, ${entry.confidence} confidence${source}`;
}
