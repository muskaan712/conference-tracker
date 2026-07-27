import { describe, expect, it } from "vitest";
import { matchEditionForCandidate, resolveMatchYear } from "../../scripts/shared/edition-matching";
import { makeEdition } from "./fixtures";

describe("resolveMatchYear", () => {
  it("prefers an explicit edition year over everything else", () => {
    expect(
      resolveMatchYear({
        seriesId: "exc",
        explicitEditionYear: 2027,
        metadataYear: 2026,
        conferenceDateYear: 2026,
        sourceRegistryEditionYear: 2025,
      }),
    ).toBe(2027);
  });

  it("falls back through metadata, then conference date, then registry year", () => {
    expect(
      resolveMatchYear({
        seriesId: "exc",
        conferenceDateYear: 2026,
        sourceRegistryEditionYear: 2025,
      }),
    ).toBe(2026);
    expect(resolveMatchYear({ seriesId: "exc", sourceRegistryEditionYear: 2025 })).toBe(2025);
  });

  it("returns undefined rather than guessing when nothing is available", () => {
    expect(resolveMatchYear({ seriesId: "exc" })).toBeUndefined();
  });
});

describe("matchEditionForCandidate", () => {
  const editions = [
    makeEdition({ slug: "exc-2026", seriesId: "exc", editionYear: 2026 }),
    makeEdition({ slug: "exc-2027", seriesId: "exc", editionYear: 2027 }),
  ];

  it("matches by explicit slug hint first", () => {
    const result = matchEditionForCandidate(editions, {
      seriesId: "exc",
      editionSlugHint: "exc-2026",
    });
    expect(result.edition?.slug).toBe("exc-2026");
    expect(result.matchedBy).toBe("slug");
  });

  it("matches by resolved year when no slug hint is given", () => {
    const result = matchEditionForCandidate(editions, {
      seriesId: "exc",
      explicitEditionYear: 2027,
    });
    expect(result.edition?.slug).toBe("exc-2027");
    expect(result.matchedBy).toBe("year");
  });

  it("never falls back to the newest edition when the year doesn't match anything on disk", () => {
    const result = matchEditionForCandidate(editions, {
      seriesId: "exc",
      explicitEditionYear: 2030,
    });
    expect(result.edition).toBeUndefined();
    expect(result.isPossibleNewEdition).toBe(true);
  });

  it("reports no match (and not a possible new edition) when no year can be resolved at all", () => {
    const result = matchEditionForCandidate(editions, { seriesId: "exc" });
    expect(result.edition).toBeUndefined();
    expect(result.matchedBy).toBe("none");
    expect(result.isPossibleNewEdition).toBe(false);
  });

  it("does not match a different series with the same year", () => {
    const result = matchEditionForCandidate(editions, {
      seriesId: "other-series",
      explicitEditionYear: 2026,
    });
    expect(result.edition).toBeUndefined();
  });
});
