import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { CoLocatedEvent, ConferenceDate, ConferenceEdition } from "@/lib/schema";
import { resolveDateInstant } from "@/lib/datetime";
import { DeadlineTypeBadge, VerificationBadge, EventTypeBadge } from "./badges";
import { Countdown } from "./countdown";
import { TimezoneDisplay } from "./timezone-display";
import { CalendarExportButton } from "./calendar-export-button";
import { icsForDeadline, icsForEventDate } from "@/lib/ics";

export type TimelineEntry =
  | { kind: "conference"; edition: ConferenceEdition; date: ConferenceDate }
  | {
      kind: "event";
      event: CoLocatedEvent;
      parentEdition?: ConferenceEdition;
      date: ConferenceDate;
    };

/** Back-compat constructor: most call sites only have main-conference dates. */
export function conferenceTimelineEntry(
  edition: ConferenceEdition,
  date: ConferenceDate,
): TimelineEntry {
  return { kind: "conference", edition, date };
}

export function eventTimelineEntry(
  event: CoLocatedEvent,
  date: ConferenceDate,
  parentEdition?: ConferenceEdition,
): TimelineEntry {
  return { kind: "event", event, parentEdition, date };
}

export function DeadlineTimelineItem({ entry, now }: { entry: TimelineEntry; now?: Date }) {
  const { date } = entry;
  const isEvent = entry.kind === "event";
  const href = isEvent ? `/events/${entry.event.slug}` : `/conferences/${entry.edition.slug}`;
  const title = isEvent
    ? (entry.event.acronym ?? entry.event.name)
    : `${entry.edition.acronym} ${entry.edition.editionYear}`;
  const icsContent = isEvent
    ? icsForEventDate(entry.event, date, now)
    : icsForDeadline(entry.edition, date, now);
  const icsFilename = isEvent
    ? `${entry.event.slug}-${date.id}.ics`
    : `${entry.edition.slug}-${date.id}.ics`;

  return (
    <li className="relative flex gap-4 py-4">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${
            isEvent ? "bg-secondary ring-secondary-soft" : "bg-accent ring-accent-soft"
          }`}
          aria-hidden
        />
        <span className="bg-border mt-1 w-px flex-1" aria-hidden />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border-border-strong text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
            {isEvent ? "Associated event" : "Main conference"}
          </span>
          {isEvent ? <EventTypeBadge type={entry.event.type} /> : null}
          <DeadlineTypeBadge type={date.type} />
          {date.verificationStatus !== "official" && date.verificationStatus !== "verified" ? (
            <VerificationBadge status={date.verificationStatus} />
          ) : null}
          <Countdown date={date} label={date.label} now={now} />
        </div>
        <p className="mt-1.5">
          <Link href={href} className="hover:text-accent font-serif text-base font-semibold">
            {title}
          </Link>{" "}
          <span className="text-muted-foreground text-sm">— {date.label}</span>
          {isEvent && entry.parentEdition ? (
            <span className="text-muted-foreground text-xs">
              {" "}
              (at{" "}
              <Link href={`/conferences/${entry.parentEdition.slug}`} className="hover:underline">
                {entry.parentEdition.acronym} {entry.parentEdition.editionYear}
              </Link>
              )
            </span>
          ) : null}
        </p>
        <div className="mt-1.5">
          <TimezoneDisplay date={date} />
        </div>
        <div className="mt-2">
          <CalendarExportButton
            content={icsContent}
            filename={icsFilename}
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
            {monthEntries.map((entry) => {
              const key =
                entry.kind === "event"
                  ? `event-${entry.event.slug}-${entry.date.id}`
                  : `conf-${entry.edition.slug}-${entry.date.id}`;
              return <DeadlineTimelineItem key={key} entry={entry} now={now} />;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
