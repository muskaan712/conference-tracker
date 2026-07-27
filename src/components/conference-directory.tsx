"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, ListFilter, Rows3, X } from "lucide-react";
import type { ConferenceEdition, DeadlineType, PaperType, ResearchArea } from "@/lib/schema";
import {
  RESEARCH_AREA_LABELS,
  RESEARCH_AREAS,
  TIERS,
  GEOGRAPHIC_CATEGORIES,
  DEADLINE_TYPES,
  PAPER_TYPES,
} from "@/lib/schema";
import { applyFilters, countActiveFilters, type ConferenceFilters } from "@/lib/filtering";
import { sortConferences, type SortOption } from "@/lib/sorting";
import { filtersToSearchParams, searchParamsToFilters } from "@/lib/query-state";
import { countryNameForCode } from "@/lib/geo";
import { DEADLINE_TYPE_META } from "@/lib/badge-meta";
import { ConferenceCard } from "./conference-card";
import { ConferenceTable } from "./conference-table";
import { ActiveFilterChips, type FilterChip } from "./active-filter-chips";
import { SortMenu } from "./sort-menu";
import { EmptyState } from "./misc";

function toggleInArray<T>(arr: T[] | undefined, value: T): T[] {
  const set = new Set(arr ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

export function ConferenceDirectory({
  editions,
  now,
}: {
  editions: ConferenceEdition[];
  now: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nowDate = useMemo(() => new Date(now), [now]);

  const initial = useMemo(() => searchParamsToFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<ConferenceFilters>(initial.filters);
  const [sort, setSort] = useState<SortOption>(initial.sort ?? "tier");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pushState = useCallback(
    (nextFilters: ConferenceFilters, nextSort: SortOption) => {
      const params = filtersToSearchParams({ filters: nextFilters, sort: nextSort });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const updateFilters = useCallback(
    (updater: (prev: ConferenceFilters) => ConferenceFilters) => {
      setFilters((prev) => {
        const next = updater(prev);
        pushState(next, sort);
        return next;
      });
    },
    [pushState, sort],
  );

  const updateSort = useCallback(
    (nextSort: SortOption) => {
      setSort(nextSort);
      pushState(filters, nextSort);
    },
    [filters, pushState],
  );

  const availableYears = useMemo(
    () => [...new Set(editions.map((e) => e.editionYear))].sort((a, b) => a - b),
    [editions],
  );
  const availableCountries = useMemo(
    () =>
      [
        ...new Set(editions.map((e) => e.countryCode).filter((c): c is string => Boolean(c))),
      ].sort(),
    [editions],
  );
  const availableTracks = useMemo(
    () => [...new Set(editions.flatMap((e) => e.tracks))].sort(),
    [editions],
  );

  const results = useMemo(() => {
    const filtered = applyFilters(editions, filters, nowDate);
    return sortConferences(filtered, sort, nowDate);
  }, [editions, filters, sort, nowDate]);

  const activeCount = countActiveFilters(filters);

  const chips: FilterChip[] = useMemo(() => {
    const list: FilterChip[] = [];
    if (filters.keyword)
      list.push({
        id: "keyword",
        label: `"${filters.keyword}"`,
        onRemove: () => updateFilters((f) => ({ ...f, keyword: undefined })),
      });
    for (const t of filters.tiers ?? [])
      list.push({
        id: `tier-${t}`,
        label: `Tier ${t}`,
        onRemove: () => updateFilters((f) => ({ ...f, tiers: toggleInArray(f.tiers, t) })),
      });
    for (const g of filters.geographicCategories ?? [])
      list.push({
        id: `geo-${g}`,
        label: g,
        onRemove: () =>
          updateFilters((f) => ({
            ...f,
            geographicCategories: toggleInArray(f.geographicCategories, g),
          })),
      });
    for (const a of filters.researchAreas ?? [])
      list.push({
        id: `area-${a}`,
        label: RESEARCH_AREA_LABELS[a],
        onRemove: () =>
          updateFilters((f) => ({ ...f, researchAreas: toggleInArray(f.researchAreas, a) })),
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
    if (filters.confirmedDatesOnly)
      list.push({
        id: "confirmed",
        label: "Confirmed dates only",
        onRemove: () => updateFilters((f) => ({ ...f, confirmedDatesOnly: false })),
      });
    if (filters.openDeadlinesOnly)
      list.push({
        id: "open",
        label: "Open deadlines only",
        onRemove: () => updateFilters((f) => ({ ...f, openDeadlinesOnly: false })),
      });
    if (filters.announcedLocationOnly)
      list.push({
        id: "announced",
        label: "Announced location only",
        onRemove: () => updateFilters((f) => ({ ...f, announcedLocationOnly: false })),
      });
    if (filters.hasOfficialRanking)
      list.push({
        id: "ranked",
        label: "Has official ranking",
        onRemove: () => updateFilters((f) => ({ ...f, hasOfficialRanking: false })),
      });
    if (filters.deadlineWithinDays != null)
      list.push({
        id: "within",
        label: `Within ${filters.deadlineWithinDays} days`,
        onRemove: () => updateFilters((f) => ({ ...f, deadlineWithinDays: undefined })),
      });
    return list;
  }, [filters, updateFilters]);

  const filterFields = (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="keyword"
          className="text-muted-foreground mb-1 block text-xs font-semibold tracking-wide uppercase"
        >
          Search
        </label>
        <input
          id="keyword"
          type="search"
          value={filters.keyword ?? ""}
          onChange={(e) => updateFilters((f) => ({ ...f, keyword: e.target.value || undefined }))}
          placeholder="Name, acronym, city…"
          className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <FilterSection title="Tier">
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((t) => (
            <ToggleChip
              key={t}
              active={(filters.tiers ?? []).includes(t)}
              onClick={() => updateFilters((f) => ({ ...f, tiers: toggleInArray(f.tiers, t) }))}
            >
              {t}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Region">
        <div className="flex flex-wrap gap-1.5">
          {GEOGRAPHIC_CATEGORIES.map((g) => (
            <ToggleChip
              key={g}
              active={(filters.geographicCategories ?? []).includes(g)}
              onClick={() =>
                updateFilters((f) => ({
                  ...f,
                  geographicCategories: toggleInArray(f.geographicCategories, g),
                }))
              }
            >
              {g}
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

      {availableTracks.length > 0 && (
        <FilterSection title="Track">
          <div className="flex flex-wrap gap-1.5">
            {availableTracks.map((t) => (
              <ToggleChip
                key={t}
                active={(filters.tracks ?? []).includes(t)}
                onClick={() => updateFilters((f) => ({ ...f, tracks: toggleInArray(f.tracks, t) }))}
              >
                {t}
              </ToggleChip>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Paper type">
        <div className="flex flex-wrap gap-1.5">
          {PAPER_TYPES.map((p: PaperType) => (
            <ToggleChip
              key={p}
              active={(filters.paperTypes ?? []).includes(p)}
              onClick={() =>
                updateFilters((f) => ({ ...f, paperTypes: toggleInArray(f.paperTypes, p) }))
              }
            >
              {p.replace(/-/g, " ")}
            </ToggleChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Deadline within">
        <div className="flex flex-wrap gap-1.5">
          {[7, 14, 30, 60].map((n) => (
            <ToggleChip
              key={n}
              active={filters.deadlineWithinDays === n}
              onClick={() =>
                updateFilters((f) => ({
                  ...f,
                  deadlineWithinDays: f.deadlineWithinDays === n ? undefined : n,
                }))
              }
            >
              {n} days
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
            checked={!!filters.openDeadlinesOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, openDeadlinesOnly: v }))}
            label="Open deadlines only"
          />
          <CheckboxRow
            checked={!!filters.announcedLocationOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, announcedLocationOnly: v }))}
            label="Announced location only"
          />
          <CheckboxRow
            checked={!!filters.hasOfficialRanking}
            onChange={(v) => updateFilters((f) => ({ ...f, hasOfficialRanking: v }))}
            label="Has official ranking"
          />
          <CheckboxRow
            checked={!!filters.onlineOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, onlineOnly: v }))}
            label="Online only"
          />
          <CheckboxRow
            checked={!!filters.hybridOnly}
            onChange={(v) => updateFilters((f) => ({ ...f, hybridOnly: v }))}
            label="Hybrid only"
          />
        </div>
      </FilterSection>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => updateFilters(() => ({}))}
          className="border-border-strong hover:bg-accent-soft hover:text-accent w-full rounded-md border py-2 text-sm font-medium"
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
              {editions.length} conferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SortMenu value={sort} onChange={updateSort} />
            <div className="border-border-strong flex overflow-hidden rounded-full border">
              <button
                type="button"
                aria-pressed={view === "cards"}
                onClick={() => setView("cards")}
                className={`p-1.5 ${view === "cards" ? "bg-accent-soft text-accent" : "bg-surface"}`}
                aria-label="Card view"
              >
                <LayoutGrid aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-pressed={view === "table"}
                onClick={() => setView("table")}
                className={`p-1.5 ${view === "table" ? "bg-accent-soft text-accent" : "bg-surface"}`}
                aria-label="Table view"
              >
                <Rows3 aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mb-4">
            <ActiveFilterChips chips={chips} onClearAll={() => updateFilters(() => ({}))} />
          </div>
        )}

        {results.length === 0 ? (
          <EmptyState
            title="No conferences match your filters"
            description="Try removing a filter or broadening your search."
            action={
              <button
                type="button"
                onClick={() => updateFilters(() => ({}))}
                className="bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-medium"
              >
                Clear all filters
              </button>
            }
          />
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((edition) => (
              <ConferenceCard key={edition.slug} edition={edition} now={nowDate} />
            ))}
          </div>
        ) : (
          <ConferenceTable editions={results} now={nowDate} />
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
                className="hover:bg-accent-soft rounded-full p-1.5"
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
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-strong bg-surface text-foreground hover:border-accent hover:text-accent"
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
        className="border-border-strong accent-accent h-4 w-4 rounded"
      />
      {label}
    </label>
  );
}
