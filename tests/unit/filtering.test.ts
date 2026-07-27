import { describe, expect, it } from "vitest";
import { applyFilters, countActiveFilters, matchesFilters } from "@/lib/filtering";
import { makeDate, makeEdition } from "./fixtures";

const NOW = new Date("2026-06-15T00:00:00.000Z");

const europeA = makeEdition({
  slug: "europe-a",
  name: "Europe A Conference",
  acronym: "EUA",
  ranking: { tier: "A*" },
  geographicCategory: "Europe",
  countryCode: "DE",
  researchAreas: ["nlp"],
  dates: [makeDate("full-paper", "2026-06-20T00:00:00.000Z")],
});

const outsideB = makeEdition({
  slug: "outside-b",
  name: "Outside B Conference",
  acronym: "OSB",
  ranking: { tier: "B" },
  geographicCategory: "Outside Europe",
  countryCode: "US",
  researchAreas: ["computer-vision"],
  dates: [makeDate("full-paper", "2026-12-01T00:00:00.000Z", { verificationStatus: "unverified" })],
});

const unclassifiedNoDate = makeEdition({
  slug: "unclassified-none",
  name: "Unclassified No-Date Conference",
  acronym: "UNC",
  ranking: { tier: "Unclassified" },
  geographicCategory: "Location not announced",
  countryCode: undefined,
  researchAreas: ["ai"],
  dates: [],
});

const dataset = [europeA, outsideB, unclassifiedNoDate];

describe("matchesFilters", () => {
  it("matches keyword against name and acronym", () => {
    expect(matchesFilters(europeA, { keyword: "EUA" }, NOW)).toBe(true);
    expect(matchesFilters(europeA, { keyword: "nonexistent" }, NOW)).toBe(false);
  });

  it("filters by tier", () => {
    expect(matchesFilters(europeA, { tiers: ["A*"] }, NOW)).toBe(true);
    expect(matchesFilters(europeA, { tiers: ["B"] }, NOW)).toBe(false);
  });

  it("filters by geographic category", () => {
    expect(matchesFilters(outsideB, { geographicCategories: ["Outside Europe"] }, NOW)).toBe(true);
    expect(matchesFilters(outsideB, { geographicCategories: ["Europe"] }, NOW)).toBe(false);
  });

  it("filters by research area", () => {
    expect(matchesFilters(europeA, { researchAreas: ["nlp"] }, NOW)).toBe(true);
    expect(matchesFilters(europeA, { researchAreas: ["computer-vision"] }, NOW)).toBe(false);
  });

  it("filters confirmedDatesOnly using date verification status", () => {
    expect(matchesFilters(europeA, { confirmedDatesOnly: true }, NOW)).toBe(true);
    expect(matchesFilters(outsideB, { confirmedDatesOnly: true }, NOW)).toBe(false);
  });

  it("filters announcedLocationOnly", () => {
    expect(matchesFilters(unclassifiedNoDate, { announcedLocationOnly: true }, NOW)).toBe(false);
    expect(matchesFilters(europeA, { announcedLocationOnly: true }, NOW)).toBe(true);
  });

  it("filters hasOfficialRanking", () => {
    expect(matchesFilters(unclassifiedNoDate, { hasOfficialRanking: true }, NOW)).toBe(false);
  });

  it("filters deadlineWithinDays", () => {
    expect(matchesFilters(europeA, { deadlineWithinDays: 7 }, NOW)).toBe(true);
    expect(matchesFilters(outsideB, { deadlineWithinDays: 7 }, NOW)).toBe(false);
  });
});

describe("applyFilters", () => {
  it("returns only matching editions", () => {
    const result = applyFilters(dataset, { geographicCategories: ["Europe"] }, NOW);
    expect(result.map((e) => e.slug)).toEqual(["europe-a"]);
  });

  it("returns everything when filters are empty", () => {
    expect(applyFilters(dataset, {}, NOW)).toHaveLength(3);
  });
});

describe("countActiveFilters", () => {
  it("counts zero for an empty filter set", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("counts array, boolean, and scalar filters", () => {
    expect(
      countActiveFilters({
        keyword: "acl",
        tiers: ["A*", "A"],
        confirmedDatesOnly: true,
        deadlineWithinDays: 14,
      }),
    ).toBe(4);
  });

  it("does not count empty arrays or false booleans", () => {
    expect(countActiveFilters({ tiers: [], onlineOnly: false })).toBe(0);
  });
});
