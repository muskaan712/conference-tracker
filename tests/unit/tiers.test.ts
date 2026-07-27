import { describe, expect, it } from "vitest";
import { compareTiers, sortByTier, tierRank } from "@/lib/tiers";
import type { Tier } from "@/lib/schema";

describe("tierRank", () => {
  it("orders tiers canonically A* → A → B → C → Unclassified", () => {
    expect(tierRank("A*")).toBeLessThan(tierRank("A"));
    expect(tierRank("A")).toBeLessThan(tierRank("B"));
    expect(tierRank("B")).toBeLessThan(tierRank("C"));
    expect(tierRank("C")).toBeLessThan(tierRank("Unclassified"));
  });
});

describe("compareTiers", () => {
  it("returns negative when a is better than b", () => {
    expect(compareTiers("A*", "B")).toBeLessThan(0);
  });
  it("returns 0 for equal tiers", () => {
    expect(compareTiers("B", "B")).toBe(0);
  });
});

describe("sortByTier", () => {
  it("sorts a mixed list into canonical tier order", () => {
    const items: { tier: Tier; name: string }[] = [
      { tier: "Unclassified", name: "z" },
      { tier: "A*", name: "a" },
      { tier: "C", name: "c" },
      { tier: "B", name: "b" },
      { tier: "A", name: "a2" },
    ];
    const sorted = sortByTier(items, (i) => i.tier);
    expect(sorted.map((i) => i.tier)).toEqual(["A*", "A", "B", "C", "Unclassified"]);
  });
});
