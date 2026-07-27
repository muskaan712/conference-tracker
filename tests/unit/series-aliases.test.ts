import { describe, expect, it } from "vitest";
import { resolveSeriesIdFromTitle } from "../../scripts/shared/series-aliases";

describe("resolveSeriesIdFromTitle", () => {
  it("resolves exact acronym matches case-insensitively", () => {
    expect(resolveSeriesIdFromTitle("AAAI")).toBe("aaai");
    expect(resolveSeriesIdFromTitle("aaai")).toBe("aaai");
    expect(resolveSeriesIdFromTitle("NeurIPS")).toBe("neurips");
  });

  it("resolves the legacy NIPS acronym to the current neurips series", () => {
    expect(resolveSeriesIdFromTitle("NIPS")).toBe("neurips");
  });

  it("resolves WWW / The Web Conference naming variants", () => {
    expect(resolveSeriesIdFromTitle("WWW")).toBe("www");
    expect(resolveSeriesIdFromTitle("The Web Conference")).toBe("www");
    expect(resolveSeriesIdFromTitle("Web Conference")).toBe("www");
  });

  it("resolves ECML / ECML PKDD naming variants", () => {
    expect(resolveSeriesIdFromTitle("ECML PKDD")).toBe("ecmlpkdd");
    expect(resolveSeriesIdFromTitle("ECML/PKDD")).toBe("ecmlpkdd");
    expect(resolveSeriesIdFromTitle("ECML")).toBe("ecmlpkdd");
  });

  it("resolves IJCAI-ECAI to the ijcai series", () => {
    expect(resolveSeriesIdFromTitle("IJCAI-ECAI")).toBe("ijcai");
    expect(resolveSeriesIdFromTitle("IJCAI ECAI")).toBe("ijcai");
  });

  it("resolves IEEE BigData casing variants", () => {
    expect(resolveSeriesIdFromTitle("IEEE BigData")).toBe("ieee-bigdata");
    expect(resolveSeriesIdFromTitle("IEEE Big Data")).toBe("ieee-bigdata");
    expect(resolveSeriesIdFromTitle("BigData")).toBe("ieee-bigdata");
  });

  it("resolves RecSys regardless of casing", () => {
    expect(resolveSeriesIdFromTitle("RecSys")).toBe("recsys");
    expect(resolveSeriesIdFromTitle("recsys")).toBe("recsys");
    expect(resolveSeriesIdFromTitle("RECSYS")).toBe("recsys");
  });

  it("tolerates a trailing edition-year suffix some feeds append", () => {
    expect(resolveSeriesIdFromTitle("AAAI2027")).toBe("aaai");
    expect(resolveSeriesIdFromTitle("aaai27")).toBe("aaai");
  });

  it("returns undefined for an unknown title rather than guessing", () => {
    expect(resolveSeriesIdFromTitle("Some Random Workshop Nobody Tracks")).toBeUndefined();
  });
});
