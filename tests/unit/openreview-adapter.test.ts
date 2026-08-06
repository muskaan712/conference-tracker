import { describe, expect, it } from "vitest";
import { openReviewVenueAdapter } from "../../scripts/shared/openreview-adapter";
import type { DiscoverySource } from "../../src/lib/schema";
import type { FetchClient } from "../../scripts/shared/fetch-client";

const openReviewSource: DiscoverySource = {
  id: "iclr-2026-openreview",
  name: "ICLR 2026 OpenReview venue group",
  url: "https://api2.openreview.net/groups?id=ICLR.cc/2026/Conference",
  type: "official-conference",
  conferenceSeries: "iclr",
  editionYear: 2026,
  enabled: true,
  trustLevel: "official",
  scanFrequency: "weekly",
  parser: "openreview-venue-group",
  failureCount: 0,
};

function stubClient(body: string, status = 200): FetchClient {
  return {
    fetchText: async () => ({ status, body, fetchedAt: new Date().toISOString() }),
  } as unknown as FetchClient;
}

// Modelled on the live shape confirmed against api2.openreview.net for
// ICLR.cc/2026/Conference — see the doc-comment on OpenReviewGroupsResponse.
const SAMPLE_RESPONSE = JSON.stringify({
  groups: [
    {
      id: "ICLR.cc/2026/Conference",
      content: {
        website: { value: "https://iclr.cc/Conferences/2026" },
        start_date: { value: "Apr 23 2026" },
        date: {
          value:
            "Submission Start: Sep 01 2025 11:59AM UTC-0, Abstract Registration: Sep 20 2025 11:59AM UTC-0, Submission Deadline: Sep 25 2025 11:59AM UTC-0",
        },
      },
    },
  ],
  count: 1,
});

describe("openReviewVenueAdapter", () => {
  it("supports only sources configured with the openreview-venue-group parser", () => {
    expect(openReviewVenueAdapter.supports(openReviewSource)).toBe(true);
    expect(
      openReviewVenueAdapter.supports({ ...openReviewSource, parser: "official-site-generic" }),
    ).toBe(false);
  });

  it("extracts abstract and full-paper deadlines from the aggregated content.date string", async () => {
    const candidates = await openReviewVenueAdapter.run(
      openReviewSource,
      stubClient(SAMPLE_RESPONSE),
    );
    expect(candidates).toHaveLength(1);
    const candidate = candidates[0];
    expect(candidate.seriesId).toBe("iclr");
    expect(candidate.officialWebsiteUrl).toBe("https://iclr.cc/Conferences/2026");

    const abstract = candidate.dates.find((d) => d.type === "abstract");
    expect(abstract?.startsAt).toBe("2025-09-20");

    const fullPaper = candidate.dates.find((d) => d.type === "full-paper");
    expect(fullPaper?.startsAt).toBe("2025-09-25");

    // "Submission Start" has no matching DeadlineType keyword — dropped, not guessed.
    expect(candidate.dates).toHaveLength(2);
  });

  it("returns no candidates when the response has no groups", async () => {
    const candidates = await openReviewVenueAdapter.run(
      openReviewSource,
      stubClient(JSON.stringify({ groups: [], count: 0 })),
    );
    expect(candidates).toEqual([]);
  });

  it("returns no candidates for malformed JSON rather than throwing", async () => {
    const candidates = await openReviewVenueAdapter.run(openReviewSource, stubClient("{not json"));
    expect(candidates).toEqual([]);
  });

  it("returns no candidates when the fetch fails", async () => {
    const candidates = await openReviewVenueAdapter.run(openReviewSource, stubClient("", 404));
    expect(candidates).toEqual([]);
  });
});
