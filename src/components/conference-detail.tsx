import Link from "next/link";
import { ExternalLink, Globe, MapPin, ScrollText, Tags } from "lucide-react";
import type { CoLocatedEvent, ConferenceEdition } from "@/lib/schema";
import { RESEARCH_AREA_LABELS, CO_LOCATED_EVENT_TYPE_LABELS } from "@/lib/schema";
import { deriveConferenceStatus } from "@/lib/status";
import { icsForConference, icsForDeadline } from "@/lib/ics";
import {
  TierBadge,
  RegionBadge,
  CountryFlag,
  StatusBadge,
  VerificationBadge,
  EventTypeBadge,
  ProceedingsBadge,
} from "./badges";
import { DeadlineTypeBadge } from "./badges";
import { TimezoneDisplay } from "./timezone-display";
import { Countdown } from "./countdown";
import { CalendarExportButton } from "./calendar-export-button";
import { SourceCitation } from "./misc";
import { resolveDateInstant } from "@/lib/datetime";

const OPEN_SUBMISSION_STATUSES = new Set([
  "Open",
  "Opening Soon",
  "Abstract Deadline Approaching",
  "Paper Deadline Approaching",
]);

function nextEventDate(event: CoLocatedEvent, now: Date) {
  const upcoming = event.dates
    .filter((d) => d.verificationStatus !== "previous-cycle")
    .map((d) => ({ d, t: resolveDateInstant(d).getTime() }))
    .filter(({ t }) => t >= now.getTime())
    .sort((a, b) => a.t - b.t);
  return upcoming[0]?.d;
}

function AssociatedEventsSection({ events, now }: { events: CoLocatedEvent[]; now: Date }) {
  if (events.length === 0) return null;

  const countsByType = new Map<string, number>();
  for (const event of events) {
    countsByType.set(event.type, (countsByType.get(event.type) ?? 0) + 1);
  }
  const openCount = events.filter((e) =>
    OPEN_SUBMISSION_STATUSES.has(deriveConferenceStatus(e.dates, now)),
  ).length;
  const nearest = events
    .map((e) => ({ e, d: nextEventDate(e, now) }))
    .filter((x): x is { e: CoLocatedEvent; d: NonNullable<ReturnType<typeof nextEventDate>> } =>
      Boolean(x.d),
    )
    .sort((a, b) => resolveDateInstant(a.d).getTime() - resolveDateInstant(b.d).getTime())[0];

  return (
    <section aria-labelledby="events-heading" className="space-y-4">
      <h2 id="events-heading" className="font-serif text-xl font-semibold">
        Workshops, tutorials and associated events
      </h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[...countsByType.entries()].map(([type, count]) => (
          <span key={type} className="border-border-strong rounded-full border px-2.5 py-1 text-xs">
            {count}{" "}
            {CO_LOCATED_EVENT_TYPE_LABELS[type as keyof typeof CO_LOCATED_EVENT_TYPE_LABELS]}
            {count === 1 ? "" : "s"}
          </span>
        ))}
        <span className="text-muted-foreground text-xs">
          {openCount} with currently open submissions
        </span>
        {nearest && (
          <span className="text-muted-foreground text-xs">
            Nearest event deadline: {nearest.e.acronym ?? nearest.e.name} — {nearest.d.label}
          </span>
        )}
      </div>
      <ul className="divide-border bg-surface border-border divide-y rounded-xl border">
        {events.map((event) => {
          const next = nextEventDate(event, now);
          return (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <Link href={`/events/${event.slug}`} className="hover:text-secondary font-medium">
                  {event.acronym ?? event.name}
                </Link>
                <p className="text-muted-foreground text-xs">{event.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <EventTypeBadge type={event.type} />
                {event.proceedings ? <ProceedingsBadge status={event.proceedings.status} /> : null}
                {next ? <Countdown date={next} label={next.label} now={now} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ConferenceDetail({
  edition,
  associatedEvents = [],
  now = new Date(),
}: {
  edition: ConferenceEdition;
  associatedEvents?: CoLocatedEvent[];
  now?: Date;
}) {
  const status = deriveConferenceStatus(edition.dates, now);
  const activeDates = [...edition.dates]
    .filter((d) => d.verificationStatus !== "previous-cycle")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const previousCycleDates = edition.dates.filter((d) => d.verificationStatus === "previous-cycle");

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={edition.ranking.tier} />
          <RegionBadge category={edition.geographicCategory} />
          <StatusBadge status={status} />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {edition.acronym} {edition.editionYear}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">{edition.name}</p>
        </div>
        <p className="text-foreground/90 max-w-3xl">{edition.description}</p>

        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          {edition.city || edition.country ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="h-4 w-4" />
              {edition.venueName ? `${edition.venueName}, ` : ""}
              {edition.city ? `${edition.city}, ` : ""}
              {edition.country}
              {edition.countryCode ? (
                <CountryFlag countryCode={edition.countryCode} className="ml-1" />
              ) : null}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="h-4 w-4" />
              Location not announced
            </span>
          )}
          {edition.submissionSystem ? (
            <span className="inline-flex items-center gap-1.5">
              <ScrollText aria-hidden className="h-4 w-4" />
              {edition.submissionSystem}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {edition.researchAreas.map((area) => (
            <span
              key={area}
              className="bg-accent-soft text-foreground/80 rounded-full px-2.5 py-1 text-xs"
            >
              {RESEARCH_AREA_LABELS[area]}
            </span>
          ))}
        </div>

        <div className="border-border flex flex-wrap gap-2 border-t pt-4">
          {edition.officialWebsiteUrl ? (
            <ExternalLinkButton href={edition.officialWebsiteUrl} label="Official website" />
          ) : null}
          {edition.cfpUrl ? (
            <ExternalLinkButton href={edition.cfpUrl} label="Call for papers" />
          ) : null}
          {edition.scheduleUrl ? (
            <ExternalLinkButton href={edition.scheduleUrl} label="Schedule" />
          ) : null}
          <CalendarExportButton
            content={icsForConference(edition, now)}
            filename={`${edition.slug}-all-dates.ics`}
            label="Export all dates (.ics)"
          />
        </div>
      </header>

      <section
        aria-labelledby="ranking-heading"
        className="border-border bg-surface rounded-xl border p-5"
      >
        <h2 id="ranking-heading" className="mb-2 font-serif text-xl font-semibold">
          Ranking
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <TierBadge tier={edition.ranking.tier} />
          {edition.ranking.source ? (
            <span className="text-muted-foreground text-sm">
              Source: {edition.ranking.source}
              {edition.ranking.edition ? ` (${edition.ranking.edition})` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">No ranking source recorded.</span>
          )}
          {edition.ranking.sourceUrl ? (
            <SourceCitation url={edition.ranking.sourceUrl} label="View source" />
          ) : null}
        </div>
        {edition.ranking.tier === "Unclassified" && (
          <p className="text-muted-foreground mt-2 text-sm">
            This venue has not been assigned a tier here — either no reliable ranking source was
            found, or it has not been independently verified. This is not a judgement about the
            venue&apos;s quality.
          </p>
        )}
        {edition.ranking.notes ? (
          <p className="text-muted-foreground mt-2 text-sm">{edition.ranking.notes}</p>
        ) : null}
      </section>

      <AssociatedEventsSection events={associatedEvents} now={now} />

      <section aria-labelledby="dates-heading">
        <h2 id="dates-heading" className="mb-4 font-serif text-xl font-semibold">
          Dates
        </h2>
        {activeDates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No dates have been announced for this edition yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {activeDates.map((date) => (
              <li key={date.id} className="border-border bg-surface rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <DeadlineTypeBadge type={date.type} />
                  <VerificationBadge status={date.verificationStatus} />
                  <Countdown date={date} label={date.label} now={now} />
                </div>
                <p className="mt-2 font-medium">{date.label}</p>
                <div className="mt-1.5">
                  <TimezoneDisplay date={date} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <SourceCitation url={date.sourceUrl} />
                  <CalendarExportButton
                    content={icsForDeadline(edition, date, now)}
                    filename={`${edition.slug}-${date.id}.ics`}
                    variant="compact"
                    label="Download .ics"
                  />
                </div>
                {date.notes ? (
                  <p className="text-muted-foreground mt-2 text-sm">{date.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tracks-heading" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2
            id="tracks-heading"
            className="mb-2 flex items-center gap-1.5 font-serif text-xl font-semibold"
          >
            <Tags aria-hidden className="h-4 w-4" />
            Tracks
          </h2>
          {edition.tracks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tracks recorded yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {edition.tracks.map((track) => (
                <li
                  key={track}
                  className="border-border-strong rounded-full border px-2.5 py-1 text-xs"
                >
                  {track}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-2 font-serif text-xl font-semibold">Paper types</h2>
          {edition.paperTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No paper types recorded yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {edition.paperTypes.map((type) => (
                <li
                  key={type}
                  className="border-border-strong rounded-full border px-2.5 py-1 text-xs capitalize"
                >
                  {type.replace(/-/g, " ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {edition.notes ? (
        <section aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="mb-2 font-serif text-xl font-semibold">
            Notes
          </h2>
          <p className="text-muted-foreground text-sm">{edition.notes}</p>
        </section>
      ) : null}

      {previousCycleDates.length > 0 && (
        <section
          aria-labelledby="previous-cycle-heading"
          className="border-border-strong rounded-xl border border-dashed p-5"
        >
          <h2 id="previous-cycle-heading" className="mb-1 font-serif text-xl font-semibold">
            Previous-cycle reference dates
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            These are dates from an earlier edition of this series, kept only as a rough reference
            for what this cycle&apos;s dates might look like. They are <strong>not</strong>{" "}
            confirmed for this edition.
          </p>
          <ul className="space-y-3">
            {previousCycleDates.map((date) => (
              <li key={date.id} className="flex flex-wrap items-center gap-2 text-sm">
                <DeadlineTypeBadge type={date.type} />
                <VerificationBadge status="previous-cycle" />
                <span className="text-muted-foreground">
                  {date.label}: {date.startsAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {edition.archiveHistory.length > 0 && (
        <section aria-labelledby="archive-heading">
          <h2
            id="archive-heading"
            className="mb-2 flex items-center gap-1.5 font-serif text-xl font-semibold"
          >
            <Globe aria-hidden className="h-4 w-4" />
            Archive
          </h2>
          <ul className="flex flex-wrap gap-2">
            {edition.archiveHistory.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/conferences/${entry.slug}`}
                  className="border-border-strong hover:border-accent hover:text-accent rounded-full border px-3 py-1 text-sm"
                >
                  {entry.editionYear}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border-strong bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
    >
      {label}
      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
    </a>
  );
}
