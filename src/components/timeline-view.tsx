"use client";

import { useMemo, useState } from "react";
import type { ConferenceEdition } from "@/lib/schema";
import { resolveDateInstant } from "@/lib/datetime";
import { DeadlineTimeline, type TimelineEntry } from "./deadline-timeline";
import { CalendarExportButton } from "./calendar-export-button";
import { EmptyState } from "./misc";
import { icsForDeadlineSet } from "@/lib/ics";

export function TimelineView({ editions, now }: { editions: ConferenceEdition[]; now: string }) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const [includeReferenceCycle, setIncludeReferenceCycle] = useState(false);
  const [includePast, setIncludePast] = useState(false);

  const entries: TimelineEntry[] = useMemo(() => {
    const list: TimelineEntry[] = [];
    for (const edition of editions) {
      for (const date of edition.dates) {
        if (date.verificationStatus === "previous-cycle" && !includeReferenceCycle) continue;
        if (!includePast && resolveDateInstant(date) < nowDate) continue;
        list.push({ edition, date });
      }
    }
    return list.sort(
      (a, b) => resolveDateInstant(a.date).getTime() - resolveDateInstant(b.date).getTime(),
    );
  }, [editions, includeReferenceCycle, includePast, nowDate]);

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
            entries,
            "AI Conference Tracker — filtered deadlines",
            nowDate,
          )}
          filename="conference-deadlines.ics"
          label={`Export ${entries.length} dates (.ics)`}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No matching dates"
          description="Try including past or reference-cycle dates."
        />
      ) : (
        <DeadlineTimeline entries={entries} now={nowDate} />
      )}
    </div>
  );
}
