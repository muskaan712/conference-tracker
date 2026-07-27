import { describe, expect, it } from "vitest";
import { sortConferences } from "@/lib/sorting";
import { makeDate, makeEdition } from "./fixtures";

const NOW = new Date("2026-06-15T00:00:00.000Z");

const editions = [
  makeEdition({
    slug: "b-tier",
    name: "B Tier Conf",
    ranking: { tier: "B" },
    countryCode: "US",
    country: "United States",
    dates: [makeDate("full-paper", "2026-08-01T00:00:00.000Z")],
  }),
  makeEdition({
    slug: "a-star",
    name: "A Star Conf",
    ranking: { tier: "A*" },
    countryCode: "DE",
    country: "Germany",
    dates: [makeDate("full-paper", "2026-06-25T00:00:00.000Z")],
  }),
  makeEdition({
    slug: "unclassified",
    name: "Unclassified Conf",
    ranking: { tier: "Unclassified" },
    countryCode: "JP",
    country: "Japan",
    dates: [],
  }),
];

describe("sortConferences", () => {
  it("sorts by tier canonically", () => {
    const sorted = sortConferences(editions, "tier", NOW);
    expect(sorted.map((e) => e.slug)).toEqual(["a-star", "b-tier", "unclassified"]);
  });

  it("sorts by nearest submission deadline", () => {
    const sorted = sortConferences(editions, "nearest-submission", NOW);
    expect(sorted[0].slug).toBe("a-star");
    expect(sorted[1].slug).toBe("b-tier");
    expect(sorted[2].slug).toBe("unclassified");
  });

  it("sorts alphabetically", () => {
    const sorted = sortConferences(editions, "alphabetical", NOW);
    expect(sorted.map((e) => e.name)).toEqual(["A Star Conf", "B Tier Conf", "Unclassified Conf"]);
  });

  it("sorts Europe-first", () => {
    const sorted = sortConferences(editions, "europe-first", NOW);
    expect(sorted[0].countryCode).toBe("DE");
  });

  it("sorts outside-Europe-first", () => {
    const sorted = sortConferences(editions, "outside-europe-first", NOW);
    expect(sorted[0].countryCode).not.toBe("DE");
  });

  it("does not mutate the input array", () => {
    const copy = [...editions];
    sortConferences(editions, "tier", NOW);
    expect(editions).toEqual(copy);
  });
});
