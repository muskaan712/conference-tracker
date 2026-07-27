import { describe, expect, it } from "vitest";
import {
  continentForCountryCode,
  countryNameForCode,
  deriveGeographicCategory,
  flagEmojiForCountryCode,
  isEuropeanCountryCode,
} from "@/lib/geo";

describe("isEuropeanCountryCode", () => {
  it("classifies Germany as European", () => {
    expect(isEuropeanCountryCode("DE")).toBe(true);
  });
  it("classifies the US as non-European", () => {
    expect(isEuropeanCountryCode("US")).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isEuropeanCountryCode(undefined)).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isEuropeanCountryCode("de")).toBe(true);
  });
});

describe("continentForCountryCode / countryNameForCode", () => {
  it("maps Japan to Asia", () => {
    expect(continentForCountryCode("JP")).toBe("Asia");
    expect(countryNameForCode("JP")).toBe("Japan");
  });
  it("returns undefined for unknown codes", () => {
    expect(continentForCountryCode("ZZ")).toBeUndefined();
  });
});

describe("deriveGeographicCategory", () => {
  it("prioritizes hybrid over country", () => {
    expect(deriveGeographicCategory({ isOnline: false, isHybrid: true, countryCode: "DE" })).toBe(
      "Hybrid",
    );
  });
  it("classifies fully online as Online", () => {
    expect(deriveGeographicCategory({ isOnline: true, isHybrid: false })).toBe("Online");
  });
  it("classifies missing country as Location not announced", () => {
    expect(deriveGeographicCategory({ isOnline: false, isHybrid: false })).toBe(
      "Location not announced",
    );
  });
  it("classifies a European venue as Europe", () => {
    expect(deriveGeographicCategory({ isOnline: false, isHybrid: false, countryCode: "FR" })).toBe(
      "Europe",
    );
  });
  it("classifies a non-European venue as Outside Europe", () => {
    expect(deriveGeographicCategory({ isOnline: false, isHybrid: false, countryCode: "JP" })).toBe(
      "Outside Europe",
    );
  });
});

describe("flagEmojiForCountryCode", () => {
  it("builds a regional indicator flag from a 2-letter code", () => {
    expect(flagEmojiForCountryCode("DE")).toBe("🇩🇪");
  });
  it("returns empty string for invalid input", () => {
    expect(flagEmojiForCountryCode("DEU")).toBe("");
  });
});
