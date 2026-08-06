/**
 * Server-only lookup of the last successful run of the weekly scanner
 * workflow, used for the homepage's "Last successful scan" tile.
 *
 * Why the GitHub API and not the conference data: the weekly workflow only
 * opens a PR when `src/data/conferences` / `src/data/events` actually changed,
 * so `edition.lastScannedAt` records "the last scan that changed something",
 * not "the last scan". A no-change run — the common case — leaves no trace in
 * the repository at all, because everything it wrote (including
 * `discovery-sources.json` health timestamps) dies with the ephemeral runner.
 * GitHub Actions run metadata is the only durable record of the run itself,
 * so it is the source of truth here. `edition.lastScannedAt` remains the
 * fallback for when GitHub is unreachable — see `resolveScanStatus()`.
 *
 * This module must never be imported by a Client Component: it reads
 * `process.env.GITHUB_TOKEN`, which is deliberately not a `NEXT_PUBLIC_*`
 * variable and must not reach the browser.
 */

const OWNER = "muskaan712";
const REPO = "conference-tracker";
const WORKFLOW_FILE = "weekly-conference-update.yml";

export const WORKFLOW_RUNS_URL =
  `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}` +
  `/runs?status=success&per_page=1`;

export const WORKFLOW_RUNS_REQUEST_TIMEOUT_MS = 5_000;

/**
 * One hour. Note that Next lowers a route's revalidation interval to the
 * lowest of any fetch it makes, so this also caps the homepage's ISR window —
 * see the comment on `revalidate` in `src/app/page.tsx`.
 */
export const AUTOMATION_STATUS_REVALIDATE_SECONDS = 3_600;

const USER_AGENT = `AI-Conference-Tracker/1.0 (+https://github.com/${OWNER}/${REPO}; homepage automation status)`;

export type AutomationStatus = {
  lastSuccessfulRunAt?: string;
  trigger?: "schedule" | "workflow_dispatch" | string;
  runUrl?: string;
  conclusion?: string;
};

/**
 * Where the timestamp on the homepage tile came from. `workflow-run` is the
 * real answer; `edition-scan` means GitHub was unavailable and we are showing
 * the older, narrower "last scan that changed data" value instead.
 */
export type ScanStatusSource = "workflow-run" | "edition-scan" | "none";

export type ResolvedScanStatus = {
  lastSuccessfulScanAt?: string;
  source: ScanStatusSource;
  /** User-facing wording only — never the raw `workflow_dispatch` event name. */
  triggerLabel?: "Scheduled" | "Manual";
  runUrl?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Pulls the one run we asked for out of the response body, tolerating anything
 * that is not the documented shape. An empty `workflow_runs` array (no
 * successful run yet) is a legitimate answer, not an error, and yields
 * `undefined` just like a malformed body does.
 */
function parseLatestRun(payload: unknown): AutomationStatus | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const runs = (payload as { workflow_runs?: unknown }).workflow_runs;
  if (!Array.isArray(runs) || runs.length === 0) return undefined;

  const run = runs[0];
  if (typeof run !== "object" || run === null) return undefined;
  const { run_started_at, created_at, event, html_url, conclusion } = run as Record<
    string,
    unknown
  >;

  // `run_started_at` is the documented field; `created_at` is only consulted
  // because a run is useless to us without any timestamp at all.
  const startedAt = isNonEmptyString(run_started_at)
    ? run_started_at
    : isNonEmptyString(created_at)
      ? created_at
      : undefined;
  if (!startedAt || Number.isNaN(new Date(startedAt).getTime())) return undefined;

  return {
    lastSuccessfulRunAt: new Date(startedAt).toISOString(),
    trigger: isNonEmptyString(event) ? event : undefined,
    runUrl: isNonEmptyString(html_url) ? html_url : undefined,
    conclusion: isNonEmptyString(conclusion) ? conclusion : undefined,
  };
}

/**
 * Returns the latest successful workflow run, or `undefined` for every failure
 * mode there is: non-200 (including a 403 rate limit), a timeout, a network
 * error, a body that is not JSON, a body that is not the documented shape, and
 * "no successful run recorded yet". Callers get one thing to handle, and the
 * homepage never depends on GitHub being up.
 */
export async function getAutomationStatus(): Promise<AutomationStatus | undefined> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };

  // Optional and server-only: the public repo works fine unauthenticated, a
  // token only buys a higher rate limit. Never a NEXT_PUBLIC_* variable.
  const token = process.env.GITHUB_TOKEN;
  if (isNonEmptyString(token)) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(WORKFLOW_RUNS_URL, {
      headers,
      signal: AbortSignal.timeout(WORKFLOW_RUNS_REQUEST_TIMEOUT_MS),
      next: { revalidate: AUTOMATION_STATUS_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      // A rate limit arrives as 403/429 with a `x-ratelimit-remaining: 0`
      // header; it needs no special handling beyond falling back, but say so
      // in the log rather than reporting a generic failure.
      const rateLimited = response.headers?.get?.("x-ratelimit-remaining") === "0";
      console.warn(
        `[automation-status] GitHub returned ${response.status}` +
          (rateLimited ? " (rate limit exhausted)" : "") +
          "; falling back to edition scan timestamps.",
      );
      return undefined;
    }

    return parseLatestRun(await response.json());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[automation-status] Could not reach GitHub (${reason}); falling back.`);
    return undefined;
  }
}

/**
 * Picks what the homepage tile should show. Pure and synchronous so the
 * fallback rules are testable without touching the network.
 */
export function resolveScanStatus(
  automation: AutomationStatus | undefined,
  fallbackEditionScanAt?: string,
): ResolvedScanStatus {
  if (automation?.lastSuccessfulRunAt) {
    return {
      lastSuccessfulScanAt: automation.lastSuccessfulRunAt,
      source: "workflow-run",
      triggerLabel: triggerLabelFor(automation.trigger),
      runUrl: automation.runUrl,
    };
  }

  if (isNonEmptyString(fallbackEditionScanAt)) {
    return { lastSuccessfulScanAt: fallbackEditionScanAt, source: "edition-scan" };
  }

  return { source: "none" };
}

/**
 * Both triggers run the identical scanner, so the distinction is supporting
 * detail, not a caveat. Anything unrecognised is labelled nothing at all
 * rather than leaking a raw event name like `workflow_dispatch` to users.
 */
function triggerLabelFor(trigger: string | undefined): "Scheduled" | "Manual" | undefined {
  if (trigger === "schedule") return "Scheduled";
  if (trigger === "workflow_dispatch") return "Manual";
  return undefined;
}
