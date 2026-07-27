import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { ConferenceDate, ConferenceEdition } from "@/lib/schema";
import { resolveDateInstant } from "@/lib/datetime";
import { DeadlineTypeBadge, VerificationBadge } from "./badges";
import { Countdown } from "./countdown";
import { TimezoneDisplay } from "./timezone-display";
import { CalendarExportButton } from "./calendar-export-button";
import { icsForDeadline } from "@/lib/ics";

export interface TimelineEntry {
  edition: ConferenceEdition;
  date: ConferenceDate;
}

export function DeadlineTimelineItem({ entry, now }: { entry: TimelineEntry; now?: Date }) {
  const { edition, date } = entry;
  return (
    <li className="relative flex gap-4 py-4">
      <div className="flex flex-col items-center">
        <span
          className="bg-accent ring-accent-soft mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4"
          aria-hidden
        />
        <span className="bg-border mt-1 w-px flex-1" aria-hidden />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineTypeBadge type={date.type} />
          {date.verificationStatus !== "official" && date.verificationStatus !== "verified" ? (
            <VerificationBadge status={date.verificationStatus} />
          ) : null}
          <Countdown date={date} label={date.label} now={now} />
        </div>
        <p className="mt-1.5">
          <Link
            href={`/conferences/${edition.slug}`}
            className="hover:text-accent font-serif text-base font-semibold"
          >
            {edition.acronym} {edition.editionYear}
          </Link>{" "}
          <span className="text-muted-foreground text-sm">— {date.label}</span>
        </p>
        <div className="mt-1.5">
          <TimezoneDisplay date={date} />
        </div>
        <div className="mt-2">
          <CalendarExportButton
            content={icsForDeadline(edition, date, now)}
            filename={`${edition.slug}-${date.id}.ics`}
            variant="compact"
            label="Download .ics"
          />
        </div>
      </div>
    </li>
  );
}

export function DeadlineTimeline({
  entries,
  now = new Date(),
}: {
  entries: TimelineEntry[];
  now?: Date;
}) {
  const groups = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const instant = resolveDateInstant(entry.date);
    const key = formatInTimeZone(instant, "UTC", "MMMM yyyy");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([month, monthEntries]) => (
        <section key={month}>
          <h3 className="bg-background/95 sticky top-0 z-10 -mx-1 mb-1 px-1 py-2 font-serif text-xl font-semibold backdrop-blur">
            {month}
          </h3>
          <ol className="divide-border/60 divide-y">
            {monthEntries.map((entry) => (
              <DeadlineTimelineItem
                key={`${entry.edition.slug}-${entry.date.id}`}
                entry={entry}
                now={now}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
