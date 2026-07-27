import { describe, expect, it } from "vitest";
import { assessPlanningWindow, planResubmissions } from "@/lib/planner";
import { makeDate, makeEdition } from "./fixtures";

describe("assessPlanningWindow", () => {
  it("returns Unrealistic for negative days available", () => {
    expect(assessPlanningWindow(-5)).toBe("Unrealistic");
  });
  it("returns Very tight just under two weeks", () => {
    expect(assessPlanningWindow(0)).toBe("Very tight");
    expect(assessPlanningWindow(13)).toBe("Very tight");
  });
  it("returns Tight between two and four weeks", () => {
    expect(assessPlanningWindow(14)).toBe("Tight");
    expect(assessPlanningWindow(29)).toBe("Tight");
  });
  it("returns Feasible between one and two months", () => {
    expect(assessPlanningWindow(30)).toBe("Feasible");
    expect(assessPlanningWindow(59)).toBe("Feasible");
  });
  it("returns Comfortable at two months or more", () => {
    expect(assessPlanningWindow(60)).toBe("Comfortable");
    expect(assessPlanningWindow(200)).toBe("Comfortable");
  });
});

describe("planResubmissions", () => {
  const candidateEditions = [
    makeEdition({
      slug: "soon-after",
      ranking: { tier: "A" },
      countryCode: "DE",
      researchAreas: ["nlp"],
      paperTypes: ["long-paper"],
      dates: [makeDate("full-paper", "2026-07-20T00:00:00.000Z")],
    }),
    makeEdition({
      slug: "far-after",
      ranking: { tier: "B" },
      countryCode: "US",
      researchAreas: ["computer-vision"],
      paperTypes: ["short-paper"],
      dates: [makeDate("full-paper", "2026-10-01T00:00:00.000Z")],
    }),
    makeEdition({
      slug: "before-notification",
      ranking: { tier: "A*" },
      dates: [makeDate("full-paper", "2026-06-01T00:00:00.000Z")],
    }),
    makeEdition({
      slug: "excluded-current",
      dates: [makeDate("full-paper", "2026-09-01T00:00:00.000Z")],
    }),
  ];

  it("excludes deadlines before notification + buffer", () => {
    const results = planResubmissions(candidateEditions, {
      expectedNotificationDate: "2026-06-15",
      researchAreas: [],
      minTier: "A*",
      maxTier: "Unclassified",
      geographicPreference: "none",
      minBufferDays: 14,
    });
    expect(results.some((r) => r.edition.slug === "before-notification")).toBe(false);
  });

  it("excludes the current conference via excludeSlug", () => {
    const results = planResubmissions(candidateEditions, {
      expectedNotificationDate: "2026-06-15",
      researchAreas: [],
      minTier: "A*",
      maxTier: "Unclassified",
      geographicPreference: "none",
      minBufferDays: 0,
      excludeSlug: "excluded-current",
    });
    expect(results.some((r) => r.edition.slug === "excluded-current")).toBe(false);
  });

  it("computes days available relative to notification + buffer, sorted ascending", () => {
    const results = planResubmissions(candidateEditions, {
      expectedNotificationDate: "2026-06-15",
      researchAreas: [],
      minTier: "A*",
      maxTier: "Unclassified",
      geographicPreference: "none",
      minBufferDays: 7,
      excludeSlug: "excluded-current",
    });
    expect(results[0].edition.slug).toBe("soon-after");
    expect(results[0].daysAvailable).toBeGreaterThanOrEqual(0);
    expect(
      results.every((r, i) => i === 0 || r.daysAvailable >= results[i - 1].daysAvailable),
    ).toBe(true);
  });

  it("flags topic/format/tier/geography compatibility correctly", () => {
    const results = planResubmissions(candidateEditions, {
      expectedNotificationDate: "2026-06-01",
      researchAreas: ["nlp"],
      minTier: "A*",
      maxTier: "A",
      geographicPreference: "europe-only",
      minBufferDays: 0,
      paperType: "long-paper",
    });
    const soonAfter = results.find((r) => r.edition.slug === "soon-after")!;
    expect(soonAfter.compatibility).toEqual({
      topic: true,
      format: true,
      tier: true,
      geography: true,
    });

    const farAfter = results.find((r) => r.edition.slug === "far-after")!;
    expect(farAfter.compatibility.topic).toBe(false);
    expect(farAfter.compatibility.geography).toBe(false);
    expect(farAfter.compatibility.tier).toBe(false);
  });
});
