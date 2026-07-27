"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, X } from "lucide-react";
import type { CoLocatedEvent, ConferenceEdition, DeadlineType, ResearchArea } from "@/lib/schema";
import {
  CO_LOCATED_EVENT_TYPE_LABELS,
  CO_LOCATED_EVENT_TYPES,
  RESEARCH_AREA_LABELS,
  RESEARCH_AREAS,
  TIERS,
  DEADLINE_TYPES,
} from "@/lib/schema";
import {
  applyEventFilters,
  countActiveEventFilters,
  type EventFilters,
} from "@/lib/event-filtering";
import {
  sortEvents,
  type EventSortOption,
  EVENT_SORT_OPTIONS,
  EVENT_SORT_LABELS,
} from "@/lib/event-sorting";
import { eventFiltersToSearchParams, searchParamsToEventFilters } from "@/lib/event-query-state";
import { countryNameForCode } from "@/lib/geo";
import { DEADLINE_TYPE_META } from "@/lib/badge-meta";
import { EventCard } from "./event-card";
import { ActiveFilterChips, type FilterChip } from "./active-filter-chips";
import { EmptyState } from "./misc";
import { ArrowUpDown } from "lucide-react";

function toggleInArray<T>(arr: T[] | undefined, value: T): T[] {
  const set = new Set(arr ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

export function EventDirectory({
  events,
  editions,
  now,
}: {
  events: CoLocatedEvent[];
  editions: ConferenceEdition[];
  now: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nowDate = useMemo(() => new Date(now), [now]);

  const initial = useMemo(() => searchParamsToEventFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<EventFilters>(initial.filters);
  const [sort, setSort] = useState<EventSortOption>(initial.sort ?? "nearest-submission");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pushState = useCallback(
    (nextFilters: EventFilters, nextSort: EventSortOption) => {
      const params = eventFiltersToSearchParams({ filters: nextFilters, sort: nextSort });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const updateFilters = useCallback(
    (updater: (prev: EventFilters) => EventFilters) => {
      setFilters((prev) => {
        const next = updater(prev);
        pushState(next, sort);
        return next;
      });
    },
    [pushState, sort],
  );

  const updateSort = useCallback(
    (nextSort: EventSortOption) => {
      setSort(nextSort);
      pushState(filters, nextSort);
    },
    [filters, pushState],
  );

  const editionsBySlug = useMemo(() => new Map(editions.map((e) => [e.slug, e])), [editions]);
  const parentOptions = useMemo(
    () => [...new Map(editions.map((e) => [e.seriesId, e.name])).entries()],
    [editions],
  );
  const availableCountries = useMemo(
    () =>
      [
        ...new Set(editions.map((e) => e.countryCode).filter((c): c is string => Boolean(c))),
      ].sort(),
    [editions],
  );
  const availableYears = useMemo(
    () => [...new Set(events.map((e) => e.editionYear))].sort((a, b) => a - b),
    [events],
  );

  const results = useMemo(() => {
    const filtered = applyEventFilters(events, filters, nowDate, editions);
    return sortEvents(filtered, sort, nowDate, editions);
  }, [events, filters, sort, nowDate, editions]);

  const activeCount = countActiveEventFilters(filters);

  const chips: FilterChip[] = useMemo(() => {
    const list: FilterChip[] = [];
    if (filters.keyword)
      list.push({
        id: "keyword",
        label: `"${filters.keyword}"`,
        onRemove: () => updateFilters((f) => ({ ...f, keyword: undefined })),
      });
    for (const t of filters.eventTypes ?? [])
      list.push({
        id: `type-${t}`,
        label: CO_LOCATED_EVENT_TYPE_LABELS[t],
        onRemove: () =>
          updateFilters((f) => ({ ...f, eventTypes: toggleInArray(f.eventTypes, t) })),
      });
    for (const t of filters.eventTiers ?? [])
      list.push({
        id: `etier-${t}`,
        label: `Event tier ${t}`,
        onRemove: () =>
          updateFilters((f) => ({ ...f, eventTiers: toggleInArray(f.eventTiers, t) })),
      });
    for (const t of filters.parentTiers ?? [])
      list.push({
        id: `ptier-${t}`,
        label: `Parent tier ${t}`,
        onRemove: () =>
          updateFilters((f) => ({ ...f, parentTiers: toggleInArray(f.parentTiers, t) })),
      });
    for (const a of filters.researchAreas ?? [])
      list.push({
        id: `area-${a}`,
        label: RESEARCH_AREA_LABELS[a],
        onRemove: () =>
          updateFilters((f) => ({ ...f, researchAreas: toggleInArray(f.researchAreas, a) })),
      });
    if (filters.europeOnly)
      list.push({
        id: "europe",
        label: "Europe",
        onRemove: () => updateFilters((f) => ({ ...f, europeOnly: false })),
      });
    if (filters.outsideEuropeOnly)
      list.push({
        id: "outside-europe",
        label: "Outside Europe",
        onRemove: () => updateFilters((f) => ({ ...f, outsideEuropeOnly: false })),
      });
    if (filters.onlineOnly)
      list.push({
        id: "online",
        label: "Online",
        onRemove: () => updateFilters((f) => ({ ...f, onlineOnly: false })),
      });
    if (filters.hybridOnly)
      list.push({
        id: "hybrid",
        label: "Hybrid",
        onRemove: () => updateFilters((f) => ({ ...f, hybridOnly: false })),
      });
    if (filters.archivalOnly)
      list.push({
        id: "archival",
        label: "Archival only",
        onRemove: () => updateFilters((f) => ({ ...f, archivalOnly: false })),
      });
    if (filters.nonArchivalOnly)
      list.push({
        id: "non-archival",
        label: "Non-archival only",
        onRemove: () => updateFilters((f) => ({ ...f, nonArchivalOnly: false })),
      });
    if (filters.unknownProceedingsOnly)
      list.push({
        id: "unknown-proceedings",
        label: "Unknown proceedings",
        onRemove: () => updateFilters((f) => ({ ...f, unknownProceedingsOnly: false })),
      });
    if (filters.confirmedDatesOnly)
      list.push({
        id: "confirmed",
        label: "Confirmed dates only",
        onRemove: () => updateFilters((f) => ({ ...f, confirmedDatesOnly: false })),
      });
    if (filters.openSubmissionsOnly)
      list.push({
        id: "open",
        label: "Open submissions only",
        onRemove: () => updateFilters((f) => ({ ...f, openSubmissionsOnly: false })),
      });
    for (const y of filters.years ?? [])
      list.push({
        id: `year-${y}`,
        label: String(y),
        onRemove: () => updateFilters((f) => ({ ...f, years: toggleInArray(f.years, y) })),
      });
    for (const c of filters.countryCodes ?? [])
      list.push({
        id: `country-${c}`,
        label: countryNameForCode(c) ?? c,
        onRemove: () =>
          updateFilters((f) => ({ ...f, countryCodes: toggleInArray(f.countryCodes, c) })),
      });
    for (const d of filters.deadlineTypes ?? [])
      list.push({
        id: `dtype-${d}`,
        label: DEADLINE_TYPE_META[d].label,
        onRemove: () =>
          updateFilters((f) => ({ ...f, deadlineTypes: toggleInArray(f.deadlineTypes, d) })),
      });
    return list;
  }, [filters, updateFilters]);

  const filterFields = (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="event-keyword"
          className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wide uppercase"
        >
          Search
        </label>
        <input
          id="event-keyword"
          type="search"
          value={filters.keyword ?? ""}
          onChange={(e) => updateFilters((f) => ({ ...f, keyword: e.target.value || undefined }))}
          placeholder="Name, acronym, keyword…"
          className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <FilterSection title="Event type">
        <div className="flex flex-wrap gap-1.5">
          {CO_LOCATED_EVENT_TYPES.map((t) => (
            <ToggleChip
              key={t}
              active={(filters.eventTypes ?? []).includes(t)}
              onClick={() =>
                updateFilters((f) => ({ ...f, eventTypes: toggleInArray(f.eventTypes, t) }))
              }
            >
              {CO_LOCATED_EVENT_TYPE_LABELS[t]}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      {parentOptions.length > 0 && (
        <FilterSection title="Parent conference">
          <div className="flex flex-wrap gap-1.5">
            {parentOptions.map(([seriesId, name]) => (
              <ToggleChip
                key={seriesId}
                active={(filters.parentConferenceSeriesIds ?? []).includes(seriesId)}
                onClick={() =>
                  updateFilters((f) => ({
                    ...f,
                    parentConferenceSeriesIds: toggleInArray(f.parentConferenceSeriesIds, seriesId),
                  }))
                }
              >
                {name}
              </ToggleChip>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Parent conference tier">
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((t) => (
            <ToggleChip
              key={t}
              active={(filters.parentTiers ?? []).includes(t)}
              onClick={() =>
                updateFilters((f) => ({ ...f, parentTiers: toggleInArray(f.parentTiers, t) }))
              }
            >
              {t}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Event tier (independent)">
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((t) => (
            <ToggleChip
              key={t}
              active={(filters.eventTiers ?? []).includes(t)}
              onClick={() =>
                updateFilters((f) => ({ ...f, eventTiers: toggleInArray(f.eventTiers, t) }))
              }
            >
              {t}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Research area">
        <div className="flex flex-wrap gap-1.5">
          {RESEARCH_AREAS.map((a: ResearchArea) => (
            <ToggleChip
              key={a}
              active={(filters.researchAreas ?? []).includes(a)}
              onClick={() =>
                updateFilters((f) => ({ ...f, researchAreas: toggleInArray(f.researchAreas, a) }))
              }
            >
              {RESEARCH_AREA_LABELS[a]}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Geography">
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            active={!!filters.europeOnly}
            onClick={() =>
              updateFilters((f) => ({ ...f, europeOnly: !f.europeOnly, outsideEuropeOnly: false }))
            }
          >
            Europe
          </ToggleChip>
          <ToggleChip
            active={!!filters.outsideEuropeOnly}
            onClick={() =>
              updateFilters((f) => ({
                ...f,
                outsideEuropeOnly: !f.outsideEuropeOnly,
                europeOnly: false,
              }))
            }
          >
            Outside Europe
          </ToggleChip>
          <ToggleChip
            active={!!filters.onlineOnly}
            onClick={() => updateFilters((f) => ({ ...f, onlineOnly: !f.onlineOnly }))}
          >
            Online
          </ToggleChip>
          <ToggleChip
            active={!!filters.hybridOnly}
            onClick={() => updateFilters((f) => ({ ...f, hybridOnly: !f.hybridOnly }))}
          >
            Hybrid
          </ToggleChip>
        </div>
      </FilterSection>

      {availableCountries.length > 0 && (
        <FilterSection title="Country">
          <div className="flex flex-wrap gap-1.5">
            {availableCountries.map((c) => (
              <ToggleChip
                key={c}
                active={(filters.countryCodes ?? []).includes(c)}
                onClick={() =>
                  updateFilters((f) => ({ ...f, countryCodes: toggleInArray(f.countryCodes, c) }))
                }
              >
                {countryNameForCode(c) ?? c}
              </ToggleChip>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Proceedings">
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            active={!!filters.archivalOnly}
            onClick={() =>
              updateFilters((f) => ({
                ...f,
                archivalOnly: !f.archivalOnly,
                nonArchivalOnly: false,
              }))
            }
          >
            Archival
          </ToggleChip>
          <ToggleChip
            active={!!filters.nonArchivalOnly}
            onClick={() =>
              updateFilters((f) => ({
                ...f,
                nonArchivalOnly: !f.nonArchivalOnly,
                archivalOnly: false,
              }))
            }
          >
            Non-archival
          </ToggleChip>
          <ToggleChip
            active={!!filters.unknownProceedingsOnly}
            onClick={() =>
              updateFilters((f) => ({ ...f, unknownProceedingsOnly: !f.unknownProceedingsOnly }))
            }
          >
            Unknown
          </ToggleChip>
        </div>
      </FilterSection>

      {availableYears.length > 0 && (
        <FilterSection title="Year">
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map((y) => (
              <ToggleChip
                key={y}
                active={(filters.years ?? []).includes(y)}
                onClick={() => updateFilters((f) => ({ ...f, years: toggleInArray(f.years, y) }))}
              >
                {y}
              </ToggleChip>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Deadline type">
        <div className="flex flex-wrap gap-1.5">
          {DEADLINE_TYPES.map((d: DeadlineType) => (
            <ToggleChip
              key={d}
              active={(filters.deadlineTypes ?? []).includes(d)}
              onClick={() =>
                updateFilters((f) => ({ ...f, deadlineTypes: toggleInArray(f.deadlineTypes, d) }))
              }
            >
              {DEADLINE_TYPE_META[d].label}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Other">
        <div className="space-y-2">
          <CheckboxRow
            checked={!!filters.confirmedDatesOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, confirmedDatesOnly: v }))}
            label="Confirmed dates only"
          />
          <CheckboxRow
            checked={!!filters.openSubmissionsOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, openSubmissionsOnly: v }))}
            label="Open submissions only"
          />
        </div>
      </FilterSection>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => updateFilters(() => ({}))}
          className="border-border-strong hover:bg-secondary-soft hover:text-secondary w-full rounded-md border py-2 text-sm font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="border-border bg-surface sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border p-4">
          {filterFields}
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="border-border-strong bg-surface inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium lg:hidden"
            >
              <ListFilter aria-hidden className="h-4 w-4" />
              Filters {activeCount > 0 ? `(${activeCount})` : ""}
            </button>
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">{results.length}</span> of{" "}
              {events.length} events
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <ArrowUpDown aria-hidden className="text-muted-foreground h-4 w-4" />
            <span className="sr-only">Sort events by</span>
            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value as EventSortOption)}
              className="border-border-strong bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
            >
              {EVENT_SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {EVENT_SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <div className="mb-4">
            <ActiveFilterChips chips={chips} onClearAll={() => updateFilters(() => ({}))} />
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState
            title="No events match your filters"
            description="Try removing a filter or broadening your search."
            action={
              <button
                type="button"
                onClick={() => updateFilters(() => ({}))}
                className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-sm font-medium"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((event) => (
              <EventCard
                key={event.slug}
                event={event}
                parent={editionsBySlug.get(event.parentConferenceEditionSlug)}
                now={nowDate}
              />
            ))}
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="bg-surface relative ml-auto flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto p-4 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="hover:bg-secondary-soft rounded-full p-1.5"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            {filterFields}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group">
      <summary className="text-muted-foreground mb-1.5 cursor-pointer text-xs font-semibold tracking-wide uppercase [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      {children}
    </details>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border-strong bg-surface text-foreground hover:border-secondary hover:text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="border-border-strong accent-secondary h-4 w-4 rounded"
      />
      {label}
    </label>
  );
}
