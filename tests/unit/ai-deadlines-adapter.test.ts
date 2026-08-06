import { describe, expect, it } from "vitest";
import {
  aiDeadlinesAdapter,
  isAoeTimezone,
  parseEntry,
  parseFeedDateTime,
} from "../../scripts/shared/ai-deadlines-adapter";
import type { DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "../../scripts/shared/fetch-client";

const discoveryOnlySource: DiscoverySource = {
  id: "ai-deadlines-feed",
  name: "AI Deadlines community feed",
  url: "https://raw.githubusercontent.com/paperswithcode/ai-deadlines/gh-pages/_data/conferences.yml",
  type: "discovery-only",
  enabled: true,
  trustLevel: "discovery-only",
  scanFrequency: "weekly",
  parser: "ai-deadlines-yaml",
  failureCount: 0,
};

describe("isAoeTimezone", () => {
  it("detects AoE / UTC-12 phrasing", () => {
    expect(isAoeTimezone("UTC-12")).toBe(true);
    expect(isAoeTimezone("AoE")).toBe(true);
    expect(isAoeTimezone("Anywhere on Earth")).toBe(true);
  });

  it("does not treat an ordinary timezone as AoE", () => {
    expect(isAoeTimezone("UTC")).toBe(false);
    expect(isAoeTimezone("PST")).toBe(false);
    expect(isAoeTimezone(undefined)).toBe(false);
  });
});

describe("parseFeedDateTime", () => {
  it("splits a feed 'YYYY-MM-DD HH:mm:ss' string into a naive ISO startsAt", () => {
    expect(parseFeedDateTime("2026-10-10 23:59:59")).toBe("2026-10-10T23:59:00");
  });

  it("accepts 'YYYY-MM-DD HH:mm' without seconds", () => {
    expect(parseFeedDateTime("2026-10-10 23:59")).toBe("2026-10-10T23:59:00");
  });

  it("returns undefined for an unparseable value rather than guessing", () => {
    expect(parseFeedDateTime("October 10th")).toBeUndefined();
    expect(parseFeedDateTime(undefined)).toBeUndefined();
    expect(parseFeedDateTime(12345)).toBeUndefined();
  });
});

describe("parseEntry", () => {
  it("maps a well-formed entry to a discovery candidate at low confidence", () => {
    const candidate = parseEntry(
      {
        title: "AAAI",
        year: 2027,
        link: "https://aaai.org/conference/aaai/aaai-27/",
        deadline: "2026-07-28 23:59:59",
        abstract_deadline: "2026-07-21 23:59:59",
        timezone: "UTC-12",
      },
      discoveryOnlySource,
    );
    expect(candidate).toBeDefined();
    expect(candidate!.seriesId).toBe("aaai");
    expect(candidate!.editionYear).toBe(2027);
    expect(candidate!.confidence).toBe("low");
    expect(candidate!.dates).toHaveLength(2);
    const fullPaper = candidate!.dates.find((d) => d.type === "full-paper");
    expect(fullPaper?.startsAt).toBe("2026-07-28T23:59:00");
    expect(fullPaper?.isAoE).toBe(true);
    expect(fullPaper?.timezone).toBe("Etc/GMT+12");
  });

  it("drops an entry whose title has no known series alias, rather than guessing", () => {
    const candidate = parseEntry(
      {
        title: "Some Untracked Workshop",
        year: 2027,
        link: "https://example.com/",
        deadline: "2026-07-28 23:59:59",
      },
      discoveryOnlySource,
    );
    expect(candidate).toBeUndefined();
  });

  it("drops an entry with no citable source URL", () => {
    const candidate = parseEntry(
      { title: "AAAI", year: 2027, deadline: "2026-07-28 23:59:59" },
      discoveryOnlySource,
    );
    expect(candidate).toBeUndefined();
  });

  it("drops an entry with no parseable dates at all", () => {
    const candidate = parseEntry(
      { title: "AAAI", year: 2027, link: "https://aaai.org/" },
      discoveryOnlySource,
    );
    expect(candidate).toBeUndefined();
  });

  it("tolerates a malformed (non-object) entry without throwing", () => {
    expect(parseEntry("not an object", discoveryOnlySource)).toBeUndefined();
    expect(parseEntry(null, discoveryOnlySource)).toBeUndefined();
    expect(parseEntry(42, discoveryOnlySource)).toBeUndefined();
  });

  it("resolves an aliased title (e.g. IJCAI-ECAI) to the tracked series", () => {
    const candidate = parseEntry(
      {
        title: "IJCAI-ECAI",
        year: 2027,
        link: "https://ijcai-27.org/",
        deadline: "2027-01-15 23:59:59",
      },
      discoveryOnlySource,
    );
    expect(candidate?.seriesId).toBe("ijcai");
  });
});

describe("aiDeadlinesAdapter.run", () => {
  function stubClient(body: string, status = 200): FetchClient {
    return {
      fetchText: async () => ({ status, body, fetchedAt: new Date().toISOString() }),
    } as unknown as FetchClient;
  }

  it("supports only sources configured with the ai-deadlines-yaml parser", () => {
    expect(aiDeadlinesAdapter.supports(discoveryOnlySource)).toBe(true);
    expect(
      aiDeadlinesAdapter.supports({ ...discoveryOnlySource, parser: "official-site-generic" }),
    ).toBe(false);
  });

  it("parses a small multi-entry YAML feed into several candidates, skipping unmapped titles", async () => {
    const yaml = `
- title: AAAI
  year: 2027
  link: https://aaai.org/conference/aaai/aaai-27/
  deadline: '2026-07-28 23:59:59'
  timezone: UTC-12
- title: Some Untracked Workshop
  year: 2027
  link: https://example.com/
  deadline: '2026-07-28 23:59:59'
- title: RecSys
  year: 2027
  link: https://recsys.acm.org/recsys27/
  deadline: '2027-05-01 23:59:59'
  timezone: UTC
`;
    const candidates = await aiDeadlinesAdapter.run(discoveryOnlySource, stubClient(yaml));
    expect(candidates.map((c) => c.seriesId).sort()).toEqual(["aaai", "recsys"]);
  });

  it("returns no candidates for malformed YAML rather than throwing", async () => {
    const candidates = await aiDeadlinesAdapter.run(
      discoveryOnlySource,
      stubClient("- title: [unterminated"),
    );
    expect(candidates).toEqual([]);
  });

  it("returns no candidates when the feed is not a YAML list", async () => {
    const candidates = await aiDeadlinesAdapter.run(
      discoveryOnlySource,
      stubClient("title: not-a-list"),
    );
    expect(candidates).toEqual([]);
  });

  it("returns no candidates when the fetch itself fails", async () => {
    const candidates = await aiDeadlinesAdapter.run(discoveryOnlySource, stubClient("", 404));
    expect(candidates).toEqual([]);
  });

  it("skips a single malformed entry in an otherwise valid list without dropping the rest", async () => {
    const yaml = `
- title: AAAI
  year: 2027
  link: https://aaai.org/conference/aaai/aaai-27/
  deadline: '2026-07-28 23:59:59'
- "just a string, not an object"
- title: RecSys
  year: 2027
  link: https://recsys.acm.org/recsys27/
  deadline: '2027-05-01 23:59:59'
`;
    const candidates = await aiDeadlinesAdapter.run(discoveryOnlySource, stubClient(yaml));
    expect(candidates.map((c) => c.seriesId).sort()).toEqual(["aaai", "recsys"]);
  });
});
