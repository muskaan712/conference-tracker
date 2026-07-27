import { describe, expect, it } from "vitest";
import { filtersToSearchParams, searchParamsToFilters, type QueryState } from "@/lib/query-state";

describe("query-state round trip", () => {
  it("serializes and deserializes filters and sort", () => {
    const state: QueryState = {
      filters: {
        keyword: "acl",
        tiers: ["A*", "A"],
        geographicCategories: ["Europe"],
        confirmedDatesOnly: true,
        deadlineWithinDays: 30,
      },
      sort: "tier",
    };
    const params = filtersToSearchParams(state);
    const parsed = searchParamsToFilters(params);
    expect(parsed.filters.keyword).toBe("acl");
    expect(parsed.filters.tiers).toEqual(["A*", "A"]);
    expect(parsed.filters.geographicCategories).toEqual(["Europe"]);
    expect(parsed.filters.confirmedDatesOnly).toBe(true);
    expect(parsed.filters.deadlineWithinDays).toBe(30);
    expect(parsed.sort).toBe("tier");
  });

  it("ignores unknown/invalid values instead of throwing", () => {
    const params = new URLSearchParams("tiers=NotATier,A&sort=not-a-sort");
    const parsed = searchParamsToFilters(params);
    expect(parsed.filters.tiers).toEqual(["A"]);
    expect(parsed.sort).toBeUndefined();
  });

  it("produces an empty query string for empty filters", () => {
    const params = filtersToSearchParams({ filters: {} });
    expect(params.toString()).toBe("");
  });
});
