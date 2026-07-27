import type { EventFilters } from "./event-filtering";
import { type EventSortOption, EVENT_SORT_OPTIONS } from "./event-sorting";
import {
  CO_LOCATED_EVENT_TYPES,
  DEADLINE_TYPES,
  RESEARCH_AREAS,
  TIERS,
  type CoLocatedEventType,
  type DeadlineType,
  type ResearchArea,
  type Tier,
} from "./schema";

const ARRAY_KEYS: Array<keyof EventFilters> = [
  "eventTypes",
  "parentConferenceSeriesIds",
  "parentTiers",
  "eventTiers",
  "researchAreas",
  "countryCodes",
  "years",
  "months",
  "deadlineTypes",
];

const BOOLEAN_KEYS: Array<keyof EventFilters> = [
  "europeOnly",
  "outsideEuropeOnly",
  "onlineOnly",
  "hybridOnly",
  "archivalOnly",
  "nonArchivalOnly",
  "unknownProceedingsOnly",
  "confirmedDatesOnly",
  "openSubmissionsOnly",
];

function filterValid<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return values.filter((v): v is T => set.has(v));
}

export interface EventQueryState {
  filters: EventFilters;
  sort?: EventSortOption;
}

export function eventFiltersToSearchParams(state: EventQueryState): URLSearchParams {
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
  if (sort) params.set("sort", sort);

  return params;
}

export function searchParamsToEventFilters(params: URLSearchParams): EventQueryState {
  const filters: EventFilters = {};

  const q = params.get("q");
  if (q) filters.keyword = q;

  const eventTypes = params.get("eventTypes");
  if (eventTypes)
    filters.eventTypes = filterValid(
      eventTypes.split(","),
      CO_LOCATED_EVENT_TYPES,
    ) as CoLocatedEventType[];

  const parentConferenceSeriesIds = params.get("parentConferenceSeriesIds");
  if (parentConferenceSeriesIds)
    filters.parentConferenceSeriesIds = parentConferenceSeriesIds.split(",").filter(Boolean);

  const parentTiers = params.get("parentTiers");
  if (parentTiers) filters.parentTiers = filterValid(parentTiers.split(","), TIERS) as Tier[];

  const eventTiers = params.get("eventTiers");
  if (eventTiers) filters.eventTiers = filterValid(eventTiers.split(","), TIERS) as Tier[];

  const researchAreas = params.get("researchAreas");
  if (researchAreas)
    filters.researchAreas = filterValid(researchAreas.split(","), RESEARCH_AREAS) as ResearchArea[];

  const countryCodes = params.get("countryCodes");
  if (countryCodes) filters.countryCodes = countryCodes.split(",").filter(Boolean);

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

  const deadlineTypes = params.get("deadlineTypes");
  if (deadlineTypes)
    filters.deadlineTypes = filterValid(deadlineTypes.split(","), DEADLINE_TYPES) as DeadlineType[];

  for (const key of BOOLEAN_KEYS) {
    if (params.get(key as string) === "1") (filters[key] as unknown as boolean) = true;
  }

  const sortParam = params.get("sort");
  const sort = EVENT_SORT_OPTIONS.includes(sortParam as EventSortOption)
    ? (sortParam as EventSortOption)
    : undefined;

  return { filters, sort };
}
