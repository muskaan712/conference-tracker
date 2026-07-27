import type { ConferenceFilters } from "./filtering";
import { type SortOption, SORT_OPTIONS } from "./sorting";
import {
  CONTINENTS,
  DEADLINE_TYPES,
  GEOGRAPHIC_CATEGORIES,
  PAPER_TYPES,
  RESEARCH_AREAS,
  TIERS,
  type Continent,
  type DeadlineType,
  type GeographicCategory,
  type PaperType,
  type ResearchArea,
  type Tier,
} from "./schema";
import { CONFERENCE_STATUSES, type ConferenceStatus } from "./status";

const ARRAY_KEYS: Array<keyof ConferenceFilters> = [
  "researchAreas",
  "tiers",
  "geographicCategories",
  "countryCodes",
  "continents",
  "statuses",
  "deadlineTypes",
  "years",
  "months",
  "paperTypes",
  "tracks",
];

const BOOLEAN_KEYS: Array<keyof ConferenceFilters> = [
  "onlineOnly",
  "hybridOnly",
  "confirmedDatesOnly",
  "openDeadlinesOnly",
  "announcedLocationOnly",
  "hasOfficialRanking",
];

function filterValid<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return values.filter((v): v is T => set.has(v));
}

export interface QueryState {
  filters: ConferenceFilters;
  sort?: SortOption;
}

export function filtersToSearchParams(state: QueryState): URLSearchParams {
  const params = new URLSearchParams();
  const { filters, sort } = state;

  if (filters.keyword) params.set("q", filters.keyword);
  for (const key of ARRAY_KEYS) {
    const value = filters[key] as unknown as (string | number)[] | undefined;
    if (value && value.length > 0) params.set(key, value.join(","));
  }
  for (const key of BOOLEAN_KEYS) {
    if (filters[key]) params.set(key, "1");
  }
  if (filters.deadlineWithinDays != null)
    params.set("deadlineWithinDays", String(filters.deadlineWithinDays));
  if (sort) params.set("sort", sort);

  return params;
}

export function searchParamsToFilters(params: URLSearchParams): QueryState {
  const filters: ConferenceFilters = {};

  const q = params.get("q");
  if (q) filters.keyword = q;

  const researchAreas = params.get("researchAreas");
  if (researchAreas)
    filters.researchAreas = filterValid(researchAreas.split(","), RESEARCH_AREAS) as ResearchArea[];

  const tiers = params.get("tiers");
  if (tiers) filters.tiers = filterValid(tiers.split(","), TIERS) as Tier[];

  const geographicCategories = params.get("geographicCategories");
  if (geographicCategories)
    filters.geographicCategories = filterValid(
      geographicCategories.split(","),
      GEOGRAPHIC_CATEGORIES,
    ) as GeographicCategory[];

  const countryCodes = params.get("countryCodes");
  if (countryCodes) filters.countryCodes = countryCodes.split(",").filter(Boolean);

  const continents = params.get("continents");
  if (continents)
    filters.continents = filterValid(continents.split(","), CONTINENTS) as Continent[];

  const statuses = params.get("statuses");
  if (statuses)
    filters.statuses = filterValid(statuses.split(","), CONFERENCE_STATUSES) as ConferenceStatus[];

  const deadlineTypes = params.get("deadlineTypes");
  if (deadlineTypes)
    filters.deadlineTypes = filterValid(deadlineTypes.split(","), DEADLINE_TYPES) as DeadlineType[];

  const years = params.get("years");
  if (years)
    filters.years = years
      .split(",")
      .map(Number)
      .filter((n) => !Number.isNaN(n));

  const months = params.get("months");
  if (months)
    filters.months = months
      .split(",")
      .map(Number)
      .filter((n) => !Number.isNaN(n));

  const paperTypes = params.get("paperTypes");
  if (paperTypes)
    filters.paperTypes = filterValid(paperTypes.split(","), PAPER_TYPES) as PaperType[];

  const tracks = params.get("tracks");
  if (tracks) filters.tracks = tracks.split(",").filter(Boolean);

  for (const key of BOOLEAN_KEYS) {
    if (params.get(key as string) === "1") (filters[key] as unknown as boolean) = true;
  }

  const deadlineWithinDays = params.get("deadlineWithinDays");
  if (deadlineWithinDays) filters.deadlineWithinDays = Number(deadlineWithinDays);

  const sortParam = params.get("sort");
  const sort = SORT_OPTIONS.includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : undefined;

  return { filters, sort };
}
