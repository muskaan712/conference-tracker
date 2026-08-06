import { isValidElement, type ReactElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackerStatistics } from "@/components/tracker-statistics";
import type { TrackerStats } from "@/lib/conferences";

const stats: TrackerStats = {
  conferenceCount: 42,
  seriesCount: 12,
  upcomingDeadlineCount: 7,
  lastTrackerUpdate: "2026-06-15T00:00:00.000Z",
  lastEditionScan: "2026-07-28T06:02:00.000Z",
};

describe("TrackerStatistics scan tile", () => {
  it("labels the tile 'Last successful scan' and shows the workflow run date", () => {
    render(
      <TrackerStatistics
        stats={stats}
        scanStatus={{
          lastSuccessfulScanAt: "2026-08-03T06:04:11.000Z",
          source: "workflow-run",
          triggerLabel: "Scheduled",
        }}
      />,
    );

    expect(screen.getByText("Last successful scan", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/Last automated scan/)).not.toBeInTheDocument();
    expect(screen.getByText("3 August 2026")).toBeInTheDocument();
  });

  it("describes a manual run in plain words, never as workflow_dispatch", () => {
    const { container } = render(
      <TrackerStatistics
        stats={stats}
        scanStatus={{
          lastSuccessfulScanAt: "2026-08-03T06:04:11.000Z",
          source: "workflow-run",
          triggerLabel: "Manual",
        }}
      />,
    );

    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(container.textContent).not.toContain("workflow_dispatch");
    expect(container.textContent).not.toContain("schedule");
  });

  it("renders the fallback edition timestamp when GitHub gave us nothing", () => {
    render(
      <TrackerStatistics
        stats={stats}
        scanStatus={{ lastSuccessfulScanAt: stats.lastEditionScan, source: "edition-scan" }}
      />,
    );

    expect(screen.getByText("28 July 2026")).toBeInTheDocument();
  });

  it("says so plainly when no scan has ever been recorded", () => {
    render(<TrackerStatistics stats={stats} scanStatus={{ source: "none" }} />);

    expect(screen.getByText("Not yet recorded")).toBeInTheDocument();
  });

  it("keeps human verification separate from the automation timestamp", () => {
    render(
      <TrackerStatistics
        stats={stats}
        scanStatus={{
          lastSuccessfulScanAt: "2026-08-03T06:04:11.000Z",
          source: "workflow-run",
          triggerLabel: "Scheduled",
        }}
      />,
    );

    // The scan tile moved to 3 August; the human-verified line must not follow it.
    expect(screen.getByText("3 August 2026")).toBeInTheDocument();
    expect(screen.getByText(/Tracker data last verified 15 June 2026/)).toBeInTheDocument();
  });
});

/** Depth-first search for the first element rendered from `type`. */
function findElement(node: ReactNode, type: unknown): ReactElement | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;
  return findElement((node.props as { children?: ReactNode }).children, type);
}

describe("HomePage when GitHub is unavailable", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("still renders, falling back to the edition scan timestamp", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { default: HomePage } = await import("@/app/page");

    const tree = await HomePage();

    const tile = findElement(tree, TrackerStatistics);
    expect(tile).toBeDefined();
    const props = tile!.props as {
      stats: TrackerStats;
      scanStatus: { source: string; lastSuccessfulScanAt?: string };
    };
    expect(props.scanStatus.source).toBe("edition-scan");
    expect(props.scanStatus.lastSuccessfulScanAt).toBe(props.stats.lastEditionScan);
    // Real data is behind this: the fallback only works if editions carry one.
    expect(props.scanStatus.lastSuccessfulScanAt).toBeTruthy();
  });

  it("prefers the workflow run over the edition timestamp when GitHub answers", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              run_started_at: "2026-08-03T06:04:11Z",
              event: "schedule",
              conclusion: "success",
              html_url: "https://github.com/muskaan712/conference-tracker/actions/runs/1",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const { default: HomePage } = await import("@/app/page");

    const tree = await HomePage();

    const props = findElement(tree, TrackerStatistics)!.props as {
      stats: TrackerStats;
      scanStatus: { source: string; lastSuccessfulScanAt?: string; triggerLabel?: string };
    };
    expect(props.scanStatus).toMatchObject({
      source: "workflow-run",
      lastSuccessfulScanAt: "2026-08-03T06:04:11.000Z",
      triggerLabel: "Scheduled",
    });
    // The human-verification date is a different concept and is untouched by
    // when the workflow happened to run.
    expect(props.stats.lastTrackerUpdate).not.toBe(props.scanStatus.lastSuccessfulScanAt);
  });
});
