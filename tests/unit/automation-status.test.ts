import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOMATION_STATUS_REVALIDATE_SECONDS,
  WORKFLOW_RUNS_URL,
  getAutomationStatus,
  resolveScanStatus,
} from "@/lib/automation-status";

/** Shape of a real `GET .../runs?status=success&per_page=1` response body. */
function runsPayload(overrides: Record<string, unknown> = {}) {
  return {
    total_count: 1,
    workflow_runs: [
      {
        id: 1234,
        run_started_at: "2026-08-03T06:04:11Z",
        created_at: "2026-08-03T06:03:58Z",
        event: "schedule",
        status: "completed",
        conclusion: "success",
        html_url: "https://github.com/muskaan712/conference-tracker/actions/runs/1234",
        ...overrides,
      },
    ],
  };
}

function jsonResponse(body: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  // Every failure path logs a warning by design; keep the test output readable.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getAutomationStatus — request", () => {
  it("calls the public workflow-runs endpoint with GitHub headers, a UA, a timeout and hourly revalidation", async () => {
    fetchMock.mockResolvedValue(jsonResponse(runsPayload()));

    await getAutomationStatus();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { next?: unknown }];
    expect(url).toBe(WORKFLOW_RUNS_URL);
    expect(url).toContain("status=success");
    expect(url).toContain("per_page=1");

    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/vnd.github+json");
    expect(headers["User-Agent"]).toMatch(/AI-Conference-Tracker/);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.next).toEqual({ revalidate: AUTOMATION_STATUS_REVALIDATE_SECONDS });
    expect(AUTOMATION_STATUS_REVALIDATE_SECONDS).toBe(3600);
  });

  it("sends no Authorization header when GITHUB_TOKEN is unset", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    fetchMock.mockResolvedValue(jsonResponse(runsPayload()));

    await getAutomationStatus();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("uses a server-only GITHUB_TOKEN for a higher rate limit when one is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "ghp_example");
    fetchMock.mockResolvedValue(jsonResponse(runsPayload()));

    await getAutomationStatus();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ghp_example");
    // The token must never be readable from the browser bundle.
    expect(WORKFLOW_RUNS_URL).not.toContain("ghp_example");
    expect(process.env.NEXT_PUBLIC_GITHUB_TOKEN).toBeUndefined();
  });
});

describe("getAutomationStatus — successful responses", () => {
  it("returns run_started_at, trigger, url and conclusion from a successful response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(runsPayload()));

    await expect(getAutomationStatus()).resolves.toEqual({
      lastSuccessfulRunAt: "2026-08-03T06:04:11.000Z",
      trigger: "schedule",
      runUrl: "https://github.com/muskaan712/conference-tracker/actions/runs/1234",
      conclusion: "success",
    });
  });

  it("reports a scheduled run as the `schedule` trigger", async () => {
    fetchMock.mockResolvedValue(jsonResponse(runsPayload({ event: "schedule" })));

    const status = await getAutomationStatus();

    expect(status?.trigger).toBe("schedule");
    expect(resolveScanStatus(status).triggerLabel).toBe("Scheduled");
  });

  it("reports a manually dispatched run as the `workflow_dispatch` trigger", async () => {
    fetchMock.mockResolvedValue(jsonResponse(runsPayload({ event: "workflow_dispatch" })));

    const status = await getAutomationStatus();

    expect(status?.trigger).toBe("workflow_dispatch");
    expect(resolveScanStatus(status).triggerLabel).toBe("Manual");
  });

  it("prefers run_started_at over created_at", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        runsPayload({
          run_started_at: "2026-08-03T06:04:11Z",
          created_at: "2025-01-01T00:00:00Z",
        }),
      ),
    );

    const status = await getAutomationStatus();

    expect(status?.lastSuccessfulRunAt).toBe("2026-08-03T06:04:11.000Z");
  });
});

describe("getAutomationStatus — failure modes", () => {
  it("returns undefined for an empty workflow-run list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ total_count: 0, workflow_runs: [] }));

    await expect(getAutomationStatus()).resolves.toBeUndefined();
  });

  it("returns undefined for a non-200 response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Not Found" }, { status: 404 }));

    await expect(getAutomationStatus()).resolves.toBeUndefined();
  });

  it("returns undefined when rate-limited", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "API rate limit exceeded for 203.0.113.1." },
        { status: 403, headers: { "x-ratelimit-remaining": "0" } },
      ),
    );

    await expect(getAutomationStatus()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("rate limit"));
  });

  it("returns undefined when the request times out", async () => {
    // What native fetch throws when an AbortSignal.timeout() fires.
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );

    await expect(getAutomationStatus()).resolves.toBeUndefined();
  });

  it("returns undefined on a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getAutomationStatus()).resolves.toBeUndefined();
  });

  it.each([
    ["a body that is not JSON", () => Promise.reject(new SyntaxError("Unexpected token <"))],
    ["a null body", () => Promise.resolve(null)],
    ["a body with no workflow_runs", () => Promise.resolve({ total_count: 3 })],
    ["workflow_runs that is not an array", () => Promise.resolve({ workflow_runs: "nope" })],
    ["a run entry that is not an object", () => Promise.resolve({ workflow_runs: ["nope"] })],
    ["a run with no timestamp", () => Promise.resolve({ workflow_runs: [{ event: "schedule" }] })],
    [
      "a run with an unparseable timestamp",
      () => Promise.resolve({ workflow_runs: [{ run_started_at: "not-a-date" }] }),
    ],
  ])("returns undefined for %s", async (_label, json) => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, headers: new Headers(), json });

    await expect(getAutomationStatus()).resolves.toBeUndefined();
  });

  it("drops non-string optional fields rather than passing them through", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(runsPayload({ event: 42, html_url: null, conclusion: {} })),
    );

    await expect(getAutomationStatus()).resolves.toEqual({
      lastSuccessfulRunAt: "2026-08-03T06:04:11.000Z",
      trigger: undefined,
      runUrl: undefined,
      conclusion: undefined,
    });
  });
});

describe("resolveScanStatus", () => {
  it("uses the workflow run when one is available", () => {
    expect(
      resolveScanStatus(
        {
          lastSuccessfulRunAt: "2026-08-03T06:04:11.000Z",
          trigger: "schedule",
          runUrl: "https://github.com/example/runs/1",
        },
        "2026-07-28T06:02:00.000Z",
      ),
    ).toEqual({
      lastSuccessfulScanAt: "2026-08-03T06:04:11.000Z",
      source: "workflow-run",
      triggerLabel: "Scheduled",
      runUrl: "https://github.com/example/runs/1",
    });
  });

  it("falls back to the newest edition lastScannedAt when GitHub is unavailable", () => {
    expect(resolveScanStatus(undefined, "2026-07-28T06:02:00.000Z")).toEqual({
      lastSuccessfulScanAt: "2026-07-28T06:02:00.000Z",
      source: "edition-scan",
    });
  });

  it("falls back when a run came back without a usable timestamp", () => {
    expect(resolveScanStatus({ trigger: "schedule" }, "2026-07-28T06:02:00.000Z")).toEqual({
      lastSuccessfulScanAt: "2026-07-28T06:02:00.000Z",
      source: "edition-scan",
    });
  });

  it("reports no scan at all when neither source has a value", () => {
    expect(resolveScanStatus(undefined, undefined)).toEqual({ source: "none" });
  });

  it("never labels an unrecognised trigger, so raw event names cannot reach the UI", () => {
    const resolved = resolveScanStatus({
      lastSuccessfulRunAt: "2026-08-03T06:04:11.000Z",
      trigger: "repository_dispatch",
    });

    expect(resolved.triggerLabel).toBeUndefined();
    expect(JSON.stringify(resolved)).not.toContain("repository_dispatch");
  });
});
