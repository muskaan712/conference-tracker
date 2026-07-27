import { describe, expect, it } from "vitest";
import {
  eventFiltersToSearchParams,
  searchParamsToEventFilters,
  type EventQueryState,
} from "@/lib/event-query-state";

describe("event query-state round trip", () => {
  it("serializes and deserializes event filters and sort", () => {
    const state: EventQueryState = {
      filters: {
        keyword: "blackbox",
        eventTypes: ["workshop", "tutorial"],
        parentTiers: ["A*"],
        eventTiers: ["Unclassified"],
        europeOnly: true,
        archivalOnly: true,
        years: [2026],
      },
      sort: "nearest-submission",
    };
    const params = eventFiltersToSearchParams(state);
    const parsed = searchParamsToEventFilters(params);
    expect(parsed.filters.keyword).toBe("blackbox");
    expect(parsed.filters.eventTypes).toEqual(["workshop", "tutorial"]);
    expect(parsed.filters.parentTiers).toEqual(["A*"]);
    expect(parsed.filters.eventTiers).toEqual(["Unclassified"]);
    expect(parsed.filters.europeOnly).toBe(true);
    expect(parsed.filters.archivalOnly).toBe(true);
    expect(parsed.filters.years).toEqual([2026]);
    expect(parsed.sort).toBe("nearest-submission");
  });

  it("ignores unknown/invalid values instead of throwing", () => {
    const params = new URLSearchParams("eventTypes=not-a-type,workshop&sort=not-a-sort");
    const parsed = searchParamsToEventFilters(params);
    expect(parsed.filters.eventTypes).toEqual(["workshop"]);
    expect(parsed.sort).toBeUndefined();
  });

  it("omits empty filters entirely rather than serializing empty strings", () => {
    const params = eventFiltersToSearchParams({ filters: {} });
    expect(params.toString()).toBe("");
  });
});
