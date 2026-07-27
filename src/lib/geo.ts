import type { Continent, GeographicCategory } from "./schema";

/**
 * Single source of truth for ISO 3166-1 alpha-2 country code -> {name, continent}.
 * Covers countries that have hosted or plausibly could host the tracked conference
 * series. Extend as new venues are announced.
 */
export const COUNTRY_INFO: Record<string, { name: string; continent: Continent }> = {
  AT: { name: "Austria", continent: "Europe" },
  AU: { name: "Australia", continent: "Oceania" },
  BE: { name: "Belgium", continent: "Europe" },
  BR: { name: "Brazil", continent: "South America" },
  CA: { name: "Canada", continent: "North America" },
  CH: { name: "Switzerland", continent: "Europe" },
  CN: { name: "China", continent: "Asia" },
  CZ: { name: "Czechia", continent: "Europe" },
  DE: { name: "Germany", continent: "Europe" },
  DK: { name: "Denmark", continent: "Europe" },
  ES: { name: "Spain", continent: "Europe" },
  FI: { name: "Finland", continent: "Europe" },
  FR: { name: "France", continent: "Europe" },
  GR: { name: "Greece", continent: "Europe" },
  HU: { name: "Hungary", continent: "Europe" },
  ID: { name: "Indonesia", continent: "Asia" },
  IE: { name: "Ireland", continent: "Europe" },
  IL: { name: "Israel", continent: "Asia" },
  IN: { name: "India", continent: "Asia" },
  IS: { name: "Iceland", continent: "Europe" },
  IT: { name: "Italy", continent: "Europe" },
  JP: { name: "Japan", continent: "Asia" },
  KR: { name: "South Korea", continent: "Asia" },
  MX: { name: "Mexico", continent: "North America" },
  MY: { name: "Malaysia", continent: "Asia" },
  NL: { name: "Netherlands", continent: "Europe" },
  NO: { name: "Norway", continent: "Europe" },
  NZ: { name: "New Zealand", continent: "Oceania" },
  PH: { name: "Philippines", continent: "Asia" },
  PL: { name: "Poland", continent: "Europe" },
  PT: { name: "Portugal", continent: "Europe" },
  QA: { name: "Qatar", continent: "Asia" },
  RO: { name: "Romania", continent: "Europe" },
  RS: { name: "Serbia", continent: "Europe" },
  RU: { name: "Russia", continent: "Europe" },
  SA: { name: "Saudi Arabia", continent: "Asia" },
  SE: { name: "Sweden", continent: "Europe" },
  SG: { name: "Singapore", continent: "Asia" },
  TH: { name: "Thailand", continent: "Asia" },
  TR: { name: "Turkey", continent: "Asia" },
  TW: { name: "Taiwan", continent: "Asia" },
  UA: { name: "Ukraine", continent: "Europe" },
  GB: { name: "United Kingdom", continent: "Europe" },
  US: { name: "United States", continent: "North America" },
  VN: { name: "Vietnam", continent: "Asia" },
  ZA: { name: "South Africa", continent: "Africa" },
};

/** ISO codes of countries considered part of "Europe" for the site's regional grouping. */
const EUROPEAN_COUNTRY_CODES = new Set(
  Object.entries(COUNTRY_INFO)
    .filter(([, info]) => info.continent === "Europe")
    .map(([code]) => code),
);

export function isEuropeanCountryCode(countryCode: string | undefined): boolean {
  if (!countryCode) return false;
  return EUROPEAN_COUNTRY_CODES.has(countryCode.toUpperCase());
}

export function continentForCountryCode(countryCode: string | undefined): Continent | undefined {
  if (!countryCode) return undefined;
  return COUNTRY_INFO[countryCode.toUpperCase()]?.continent;
}

export function countryNameForCode(countryCode: string | undefined): string | undefined {
  if (!countryCode) return undefined;
  return COUNTRY_INFO[countryCode.toUpperCase()]?.name;
}

/**
 * Derives the edition's geographic category from its *announced venue*, never
 * the organiser's headquarters. Online/hybrid flags take precedence over
 * venue country since those describe how attendees can participate.
 */
export function deriveGeographicCategory(input: {
  isOnline: boolean;
  isHybrid: boolean;
  countryCode?: string;
}): GeographicCategory {
  if (input.isHybrid) return "Hybrid";
  if (input.isOnline) return "Online";
  if (!input.countryCode) return "Location not announced";
  return isEuropeanCountryCode(input.countryCode) ? "Europe" : "Outside Europe";
}

/** Renders a Unicode regional-indicator flag from an ISO 3166-1 alpha-2 code. */
export function flagEmojiForCountryCode(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const codePoints = [...code].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
