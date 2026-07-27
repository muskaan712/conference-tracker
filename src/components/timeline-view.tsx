"use client";

import { useMemo, useState } from "react";
import type { CoLocatedEvent, ConferenceEdition } from "@/lib/schema";
import { resolveDateInstant } from "@/lib/datetime";
import {
  DeadlineTimeline,
  conferenceTimelineEntry,
  eventTimelineEntry,
  type TimelineEntry,
} from "./deadline-timeline";
import { CalendarExportButton } from "./calendar-export-button";
import { EmptyState } from "./misc";
import { icsForDeadlineSet } from "@/lib/ics";

type EventTypeGroup = "workshop" | "tutorial" | "shared-task" | "competition-challenge" | "other";

function groupFor(type: CoLocatedEvent["type"]): EventTypeGroup {
  if (type === "workshop") return "workshop";
  if (type === "tutorial") return "tutorial";
  if (type === "shared-task") return "shared-task";
  if (type === "competition" || type === "challenge") return "competition-challenge";
  return "other";
}

const EVENT_GROUP_LABELS: Record<EventTypeGroup, string> = {
  workshop: "Workshops",
  tutorial: "Tutorials",
  "shared-task": "Shared tasks",
  "competition-challenge": "Competitions & challenges",
  other: "Other events",
};

export function TimelineView({
  editions,
  events,
  now,
}: {
  editions: ConferenceEdition[];
  events: CoLocatedEvent[];
  now: string;
}) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const [includeReferenceCycle, setIncludeReferenceCycle] = useState(false);
  const [includePast, setIncludePast] = useState(false);
  const [showMainConference, setShowMainConference] = useState(true);
  const [visibleEventGroups, setVisibleEventGroups] = useState<Set<EventTypeGroup>>(
    () => new Set(["workshop", "tutorial", "shared-task", "competition-challenge", "other"]),
  );

  function toggleGroup(group: EventTypeGroup) {
    setVisibleEventGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  const editionsBySlug = useMemo(() => new Map(editions.map((e) => [e.slug, e])), [editions]);

  const entries: TimelineEntry[] = useMemo(() => {
    const list: TimelineEntry[] = [];
    if (showMainConference) {
      for (const edition of editions) {
        for (const date of edition.dates) {
          if (date.verificationStatus === "previous-cycle" && !includeReferenceCycle) continue;
          if (!includePast && resolveDateInstant(date) < nowDate) continue;
          list.push(conferenceTimelineEntry(edition, date));
        }
      }
    }
    for (const event of events) {
      if (!visibleEventGroups.has(groupFor(event.type))) continue;
      const parent = editionsBySlug.get(event.parentConferenceEditionSlug);
      for (const date of event.dates) {
        if (date.verificationStatus === "previous-cycle" && !includeReferenceCycle) continue;
        if (!includePast && resolveDateInstant(date) < nowDate) continue;
        list.push(eventTimelineEntry(event, date, parent));
      }
    }
    return list.sort(
      (a, b) => resolveDateInstant(a.date).getTime() - resolveDateInstant(b.date).getTime(),
    );
  }, [
    editions,
    editionsBySlug,
    events,
    includeReferenceCycle,
    includePast,
    nowDate,
    showMainConference,
    visibleEventGroups,
  ]);

  return (
    <div className="space-y-6">
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
            Include past dates
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeReferenceCycle}
              onChange={(e) => setIncludeReferenceCycle(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
            Include previous-cycle reference dates
          </label>
        </div>
        <CalendarExportButton
          content={icsForDeadlineSet(
            entries.filter(
              (e): e is Extract<TimelineEntry, { kind: "conference" }> => e.kind === "conference",
            ),
            "AI Conference Tracker — filtered deadlines",
            nowDate,
          )}
          filename="conference-deadlines.ics"
          label={`Export ${entries.length} dates (.ics)`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <TypeToggle active={showMainConference} onClick={() => setShowMainConference((v) => !v)}>
          Main conference deadlines
        </TypeToggle>
        {(Object.keys(EVENT_GROUP_LABELS) as EventTypeGroup[]).map((group) => (
          <TypeToggle
            key={group}
            active={visibleEventGroups.has(group)}
            onClick={() => toggleGroup(group)}
          >
            {EVENT_GROUP_LABELS[group]}
          </TypeToggle>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No matching dates"
          description="Try including past or reference-cycle dates, or re-enabling a deadline type above."
        />
      ) : (
        <DeadlineTimeline entries={entries} now={nowDate} />
      )}
    </div>
  );
}

function TypeToggle({
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
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border-strong bg-surface text-muted-foreground hover:border-secondary hover:text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
