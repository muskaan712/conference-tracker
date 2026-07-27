"use client";

import { useMemo, useState } from "react";
import type { ConferenceEdition } from "@/lib/schema";
import {
  RESEARCH_AREA_LABELS,
  RESEARCH_AREAS,
  TIERS,
  PAPER_TYPES,
  type PaperType,
  type ResearchArea,
  type Tier,
} from "@/lib/schema";
import { planResubmissions, type GeographicPreference } from "@/lib/planner";
import { PlannerResultCard } from "./planner-result-card";
import { EmptyState } from "./misc";
import { resolveDateInstant } from "@/lib/datetime";
import { formatInTimeZone } from "date-fns-tz";

function toggleInArray<T>(arr: T[], value: T): T[] {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

export function ResubmissionPlanner({ editions }: { editions: ConferenceEdition[] }) {
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [notificationDate, setNotificationDate] = useState<string>("");
  const [researchAreas, setResearchAreas] = useState<ResearchArea[]>([]);
  const [minTier, setMinTier] = useState<Tier>("A*");
  const [maxTier, setMaxTier] = useState<Tier>("Unclassified");
  const [geoPreference, setGeoPreference] = useState<GeographicPreference>("none");
  const [bufferDays, setBufferDays] = useState(21);
  const [paperType, setPaperType] = useState<PaperType | "">("");
  const [track, setTrack] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentEdition = editions.find((e) => e.slug === currentSlug);
  const availableTracks = useMemo(
    () => [...new Set(editions.flatMap((e) => e.tracks))].sort(),
    [editions],
  );

  function handleCurrentSlugChange(slug: string) {
    setCurrentSlug(slug);
    const edition = editions.find((e) => e.slug === slug);
    const notif = edition?.dates.find(
      (d) => d.type === "notification" || d.type === "arr-commitment",
    );
    if (notif) {
      const instant = resolveDateInstant(notif);
      setNotificationDate(formatInTimeZone(instant, "UTC", "yyyy-MM-dd"));
    }
  }

  const results = useMemo(() => {
    if (!submitted || !notificationDate) return null;
    return planResubmissions(editions, {
      expectedNotificationDate: notificationDate,
      researchAreas,
      minTier,
      maxTier,
      geographicPreference: geoPreference,
      minBufferDays: bufferDays,
      paperType: paperType || undefined,
      requiredTrack: track || undefined,
      excludeSlug: currentSlug || undefined,
    });
  }, [
    submitted,
    notificationDate,
    researchAreas,
    minTier,
    maxTier,
    geoPreference,
    bufferDays,
    paperType,
    track,
    currentSlug,
    editions,
  ]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="border-border bg-surface space-y-5 rounded-xl border p-5"
      >
        <div>
          <label htmlFor="current-conference" className="mb-1 block text-sm font-medium">
            Current submitted conference (optional)
          </label>
          <select
            id="current-conference"
            value={currentSlug}
            onChange={(e) => handleCurrentSlugChange(e.target.value)}
            className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {editions.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.acronym} {e.editionYear}
              </option>
            ))}
          </select>
          {currentEdition && (
            <p className="text-muted-foreground mt-1 text-xs">
              Excluded from results; notification date prefilled if on file.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="notification-date" className="mb-1 block text-sm font-medium">
            Expected notification date
          </label>
          <input
            id="notification-date"
            type="date"
            required
            value={notificationDate}
            onChange={(e) => setNotificationDate(e.target.value)}
            className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="buffer-days" className="mb-1 block text-sm font-medium">
            Minimum preparation buffer (days)
          </label>
          <input
            id="buffer-days"
            type="number"
            min={0}
            value={bufferDays}
            onChange={(e) => setBufferDays(Number(e.target.value))}
            className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Paper research areas</legend>
          <div className="flex flex-wrap gap-1.5">
            {RESEARCH_AREAS.map((a) => (
              <button
                type="button"
                key={a}
                aria-pressed={researchAreas.includes(a)}
                onClick={() => setResearchAreas((prev) => toggleInArray(prev, a))}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  researchAreas.includes(a)
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border-strong"
                }`}
              >
                {RESEARCH_AREA_LABELS[a]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min-tier" className="mb-1 block text-sm font-medium">
              Best acceptable tier
            </label>
            <select
              id="min-tier"
              value={minTier}
              onChange={(e) => setMinTier(e.target.value as Tier)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="max-tier" className="mb-1 block text-sm font-medium">
              Loosest acceptable tier
            </label>
            <select
              id="max-tier"
              value={maxTier}
              onChange={(e) => setMaxTier(e.target.value as Tier)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Geographic preference</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                ["none", "No preference"],
                ["europe-only", "Europe only"],
                ["outside-europe", "Outside Europe"],
              ] as [GeographicPreference, string][]
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="geo-preference"
                  checked={geoPreference === value}
                  onChange={() => setGeoPreference(value)}
                  className="accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="paper-type" className="mb-1 block text-sm font-medium">
            Paper type
          </label>
          <select
            id="paper-type"
            value={paperType}
            onChange={(e) => setPaperType(e.target.value as PaperType | "")}
            className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {PAPER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/-/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="track" className="mb-1 block text-sm font-medium">
            Required track
          </label>
          <select
            id="track"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {availableTracks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-accent text-accent-foreground w-full rounded-full py-2.5 text-sm font-semibold hover:opacity-90"
        >
          Find candidate venues
        </button>
      </form>

      <div className="space-y-4">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          This planner is a scheduling aid only. It says nothing about your paper&apos;s topical
          fit, eligibility, or likelihood of acceptance at any venue listed below.
        </p>
        {!results ? (
          <EmptyState
            title="Fill in the form to see candidate venues"
            description="Results appear here once you submit."
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="No matching venues found"
            description="Try loosening your tier range, buffer, or geographic preference."
          />
        ) : (
          <ul className="space-y-4">
            {results.map((result) => (
              <PlannerResultCard key={result.edition.slug} result={result} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
