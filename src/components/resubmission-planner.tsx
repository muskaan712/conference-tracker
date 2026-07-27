"use client";

import { useMemo, useState } from "react";
import type { CoLocatedEvent, ConferenceEdition } from "@/lib/schema";
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
import { planEventResubmissions } from "@/lib/event-planner";
import { PlannerResultCard } from "./planner-result-card";
import { EventPlannerResultCard } from "./event-planner-result-card";
import { EmptyState, DataDisclaimer } from "./misc";
import { resolveDateInstant } from "@/lib/datetime";
import { formatInTimeZone } from "date-fns-tz";
import { useSavedPlansStore, type PlanStorageTarget } from "@/lib/firebase/use-saved-plans-store";
import type { SavedResubmissionPlan } from "@/lib/firebase/firestore-schema";

function newPlanId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

export function ResubmissionPlanner({
  editions,
  events = [],
}: {
  editions: ConferenceEdition[];
  events?: CoLocatedEvent[];
}) {
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

  const [includeEvents, setIncludeEvents] = useState(false);
  const [workshopsOnly, setWorkshopsOnly] = useState(false);
  const [sharedTasksOnly, setSharedTasksOnly] = useState(false);
  const [eventArchivalOnly, setEventArchivalOnly] = useState(false);
  const [eventEuropeOnly, setEventEuropeOnly] = useState(false);
  const [eventParentTier, setEventParentTier] = useState<Tier | "">("");
  const [eventTier, setEventTier] = useState<Tier | "">("");
  const [eventMinBuffer, setEventMinBuffer] = useState(0);

  const savedPlans = useSavedPlansStore();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [planName, setPlanName] = useState("");
  const [saveStorage, setSaveStorage] = useState<PlanStorageTarget>(savedPlans.defaultStorage);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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

  const eventResults = useMemo(() => {
    if (!submitted || !notificationDate || !includeEvents) return null;
    const eventTypes = workshopsOnly
      ? (["workshop"] as const)
      : sharedTasksOnly
        ? (["shared-task"] as const)
        : undefined;
    return planEventResubmissions(
      events,
      {
        expectedNotificationDate: notificationDate,
        researchAreas,
        geographicPreference: eventEuropeOnly ? "europe-only" : geoPreference,
        minBufferDays: Math.max(bufferDays, eventMinBuffer),
        eventTypes: eventTypes ? [...eventTypes] : undefined,
        archivalOnly: eventArchivalOnly,
        parentTiers: eventParentTier ? [eventParentTier] : undefined,
        eventTiers: eventTier ? [eventTier] : undefined,
      },
      editions,
    );
  }, [
    submitted,
    notificationDate,
    includeEvents,
    workshopsOnly,
    sharedTasksOnly,
    eventArchivalOnly,
    eventEuropeOnly,
    eventParentTier,
    eventTier,
    eventMinBuffer,
    bufferDays,
    researchAreas,
    geoPreference,
    events,
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

        <fieldset className="border-border-strong space-y-2 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={includeEvents}
              onChange={(e) => setIncludeEvents(e.target.checked)}
              className="accent-secondary h-4 w-4"
            />
            Include workshops and associated events
          </label>
          {includeEvents && (
            <div className="space-y-2 pl-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workshopsOnly}
                  onChange={(e) => {
                    setWorkshopsOnly(e.target.checked);
                    if (e.target.checked) setSharedTasksOnly(false);
                  }}
                  className="accent-secondary h-4 w-4"
                />
                Workshops only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sharedTasksOnly}
                  onChange={(e) => {
                    setSharedTasksOnly(e.target.checked);
                    if (e.target.checked) setWorkshopsOnly(false);
                  }}
                  className="accent-secondary h-4 w-4"
                />
                Shared tasks only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventArchivalOnly}
                  onChange={(e) => setEventArchivalOnly(e.target.checked)}
                  className="accent-secondary h-4 w-4"
                />
                Archival only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventEuropeOnly}
                  onChange={(e) => setEventEuropeOnly(e.target.checked)}
                  className="accent-secondary h-4 w-4"
                />
                Europe only
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="event-parent-tier" className="mb-1 block text-xs font-medium">
                    Parent tier
                  </label>
                  <select
                    id="event-parent-tier"
                    value={eventParentTier}
                    onChange={(e) => setEventParentTier(e.target.value as Tier | "")}
                    className="border-border-strong bg-surface w-full rounded-md border px-2 py-1.5 text-xs"
                  >
                    <option value="">Any</option>
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="event-tier" className="mb-1 block text-xs font-medium">
                    Independent event tier
                  </label>
                  <select
                    id="event-tier"
                    value={eventTier}
                    onChange={(e) => setEventTier(e.target.value as Tier | "")}
                    className="border-border-strong bg-surface w-full rounded-md border px-2 py-1.5 text-xs"
                  >
                    <option value="">Any</option>
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="event-min-buffer" className="mb-1 block text-xs font-medium">
                  Minimum preparation buffer (days)
                </label>
                <input
                  id="event-min-buffer"
                  type="number"
                  min={0}
                  value={eventMinBuffer}
                  onChange={(e) => setEventMinBuffer(Number(e.target.value))}
                  className="border-border-strong bg-surface w-full rounded-md border px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          )}
        </fieldset>

        <button
          type="submit"
          className="bg-accent text-accent-foreground w-full rounded-full py-2.5 text-sm font-semibold hover:opacity-90"
        >
          Find candidate venues
        </button>
      </form>

      <div className="space-y-4">
        <DataDisclaimer className="border-secondary/40" compact />
        <p
          role="note"
          className="border-border-strong bg-surface text-muted-foreground rounded-lg border px-3 py-2 text-xs"
        >
          <strong>Private:</strong> Your selections are processed only in this browser and are not
          saved or shared unless you explicitly save them to your account.
        </p>
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          This planner is a scheduling aid only. It says nothing about your paper&apos;s topical
          fit, eligibility, or likelihood of acceptance at any venue listed below.
        </p>

        {results && results.length > 0 && (
          <div className="border-border-strong rounded-lg border p-3">
            {!showSaveForm ? (
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                className="border-border-strong rounded-full border px-3 py-1.5 text-xs font-medium"
              >
                Save plan
              </button>
            ) : (
              <div className="space-y-2">
                <label htmlFor="plan-name" className="block text-xs font-medium">
                  Plan name
                </label>
                <input
                  id="plan-name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. NeurIPS rejection fallback"
                  className="border-border-strong bg-surface w-full rounded-md border px-2 py-1.5 text-xs"
                />
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={saveStorage === "local"}
                      onChange={() => setSaveStorage("local")}
                      className="accent-accent"
                    />
                    Save locally (this browser)
                  </label>
                  <label
                    className={`flex items-center gap-1.5 ${savedPlans.cloudAvailable ? "" : "opacity-50"}`}
                  >
                    <input
                      type="radio"
                      checked={saveStorage === "cloud"}
                      onChange={() => setSaveStorage("cloud")}
                      disabled={!savedPlans.cloudAvailable}
                      className="accent-accent"
                    />
                    Save to my account {savedPlans.cloudAvailable ? "" : "(sign in required)"}
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!planName.trim()}
                    onClick={async () => {
                      const now = new Date().toISOString();
                      const plan: SavedResubmissionPlan = {
                        id: newPlanId(),
                        name: planName.trim(),
                        expectedNotificationDate: notificationDate,
                        researchAreas,
                        minTier,
                        maxTier,
                        geographicPreference: geoPreference,
                        minBufferDays: bufferDays,
                        paperType: paperType || undefined,
                        requiredTrack: track || undefined,
                        includeEvents,
                        selectedTargets: results.map((r) => r.edition.slug),
                        createdAt: now,
                        updatedAt: now,
                      };
                      await savedPlans.savePlan(plan, saveStorage);
                      setSaveStatus(`Saved "${plan.name}".`);
                      setShowSaveForm(false);
                      setPlanName("");
                    }}
                    className="bg-accent text-accent-foreground rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Confirm save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="border-border-strong rounded-full border px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {saveStatus && <p className="text-muted-foreground mt-2 text-xs">{saveStatus}</p>}
          </div>
        )}

        {savedPlans.entries.length > 0 && (
          <div className="border-border-strong rounded-lg border p-3">
            <button
              type="button"
              onClick={() => setShowSavedPlans((v) => !v)}
              className="text-xs font-medium"
            >
              My saved plans ({savedPlans.entries.length}) {showSavedPlans ? "▲" : "▼"}
            </button>
            {showSavedPlans && (
              <ul className="mt-2 space-y-1.5">
                {savedPlans.entries.map(({ plan, storage }) => (
                  <li
                    key={`${storage}-${plan.id}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span>
                      {plan.name}{" "}
                      <span className="text-muted-foreground">
                        ({storage === "cloud" ? "cloud" : "local"})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => savedPlans.deletePlan(plan.id, storage)}
                      className="text-red-700 underline dark:text-red-300"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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

        {includeEvents && eventResults && (
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-semibold">Workshops &amp; associated events</h3>
            {eventResults.length === 0 ? (
              <EmptyState
                title="No matching events found"
                description="Try loosening the event filters above."
              />
            ) : (
              <ul className="space-y-4">
                {eventResults.map((result) => (
                  <EventPlannerResultCard key={result.event.slug} result={result} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
