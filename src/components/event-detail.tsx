import Link from "next/link";
import { ExternalLink, Globe, MapPin, ScrollText, Tags } from "lucide-react";
import type { CoLocatedEvent, ConferenceEdition } from "@/lib/schema";
import { RESEARCH_AREA_LABELS } from "@/lib/schema";
import { deriveConferenceStatus } from "@/lib/status";
import { icsForEvent, icsForEventDate } from "@/lib/ics";
import { resolveEventLocation } from "@/lib/event-location";
import {
  EventTypeBadge,
  EventLifecycleBadge,
  StatusBadge,
  VerificationBadge,
  ProceedingsBadge,
  ParentTierBadge,
  TierBadge,
  CountryFlag,
} from "./badges";
import { DeadlineTypeBadge } from "./badges";
import { TimezoneDisplay } from "./timezone-display";
import { Countdown } from "./countdown";
import { CalendarExportButton } from "./calendar-export-button";
import { SourceCitation } from "./misc";

export function EventDetail({
  event,
  parent,
  now = new Date(),
}: {
  event: CoLocatedEvent;
  parent: ConferenceEdition | undefined;
  now?: Date;
}) {
  const status = deriveConferenceStatus(event.dates, now);
  const activeDates = [...event.dates]
    .filter((d) => d.verificationStatus !== "previous-cycle")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const location = resolveEventLocation(event, parent);

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <EventTypeBadge type={event.type} />
          <EventLifecycleBadge status={event.lifecycleStatus} />
          <StatusBadge status={status} />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {event.acronym ?? event.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">{event.name}</p>
          {parent ? (
            <p className="mt-2 text-sm">
              Co-located with{" "}
              <Link href={`/conferences/${parent.slug}`} className="text-accent hover:underline">
                {parent.acronym} {parent.editionYear}
              </Link>{" "}
              — {parent.name}
            </p>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">
              Parent conference edition not found in the current dataset.
            </p>
          )}
        </div>
        {event.description ? (
          <p className="text-foreground/90 max-w-3xl">{event.description}</p>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="h-4 w-4" />
            {location.venueName ? `${location.venueName}, ` : ""}
            {location.city ? `${location.city}, ` : ""}
            {location.country ??
              (location.mode === "location-not-announced"
                ? "Location not announced"
                : location.mode)}
            {location.countryCode ? (
              <CountryFlag countryCode={location.countryCode} className="ml-1" />
            ) : null}
            <span className="ml-1 text-xs italic">
              ({location.inherited ? "inherited from parent conference" : "event-specific location"}
              )
            </span>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {event.researchAreas.map((area) => (
            <span
              key={area}
              className="bg-secondary-soft text-foreground/80 rounded-full px-2.5 py-1 text-xs"
            >
              {RESEARCH_AREA_LABELS[area]}
            </span>
          ))}
        </div>

        <div className="border-border flex flex-wrap gap-2 border-t pt-4">
          {event.officialWebsiteUrl ? (
            <ExternalLinkButton href={event.officialWebsiteUrl} label="Official website" />
          ) : null}
          {event.callForPapersUrl ? (
            <ExternalLinkButton href={event.callForPapersUrl} label="Call for papers" />
          ) : null}
          {event.submissionSystemUrl ? (
            <ExternalLinkButton href={event.submissionSystemUrl} label="Submission system" />
          ) : null}
          {event.programmeUrl ? (
            <ExternalLinkButton href={event.programmeUrl} label="Programme" />
          ) : null}
          {event.parentProgrammeUrl ? (
            <ExternalLinkButton href={event.parentProgrammeUrl} label="Parent programme" />
          ) : null}
          {event.dates.length > 0 ? (
            <CalendarExportButton
              content={icsForEvent(event, now)}
              filename={`${event.slug}-all-dates.ics`}
              label="Export all dates (.ics)"
            />
          ) : null}
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
          <TierBadge tier={event.ranking.tier} />
          {parent ? <ParentTierBadge tier={parent.ranking.tier} /> : null}
          {event.ranking.source ? (
            <span className="text-muted-foreground text-sm">
              Source: {event.ranking.source}
              {event.ranking.edition ? ` (${event.ranking.edition})` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">
              No independent ranking source recorded.
            </span>
          )}
          {event.ranking.sourceUrl ? (
            <SourceCitation url={event.ranking.sourceUrl} label="View source" />
          ) : null}
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          An associated event&apos;s ranking is always assessed independently of its parent
          conference — it is never inferred from the parent&apos;s tier, publisher, indexing, or
          reputation.
          {event.ranking.tier === "Unclassified" &&
            " This event has not been assigned a tier here, either because no reliable independent ranking source was found, or it has not been verified."}
        </p>
        {event.ranking.notes ? (
          <p className="text-muted-foreground mt-2 text-sm">{event.ranking.notes}</p>
        ) : null}
      </section>

      <section aria-labelledby="dates-heading">
        <h2 id="dates-heading" className="mb-4 font-serif text-xl font-semibold">
          Event dates
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          These are this event&apos;s own dates — distinct from{" "}
          {parent ? `${parent.acronym}'s` : "the parent conference's"} main-track deadlines, shown
          on the parent conference page.
        </p>
        {activeDates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No dates have been announced for this event yet.
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
                    content={icsForEventDate(event, date, now)}
                    filename={`${event.slug}-${date.id}.ics`}
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

      <section
        aria-labelledby="submission-heading"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2"
      >
        <div>
          <h2
            id="submission-heading"
            className="mb-2 flex items-center gap-1.5 font-serif text-xl font-semibold"
          >
            <Tags aria-hidden className="h-4 w-4" />
            Submission details
          </h2>
          <dl className="space-y-1.5 text-sm">
            {event.paperTypes.length > 0 && (
              <div>
                <dt className="text-muted-foreground inline">Paper types: </dt>
                <dd className="inline">
                  {event.paperTypes.map((t) => t.replace(/-/g, " ")).join(", ")}
                </dd>
              </div>
            )}
            {event.pageLimit && (
              <div>
                <dt className="text-muted-foreground inline">Page limit: </dt>
                <dd className="inline">{event.pageLimit}</dd>
              </div>
            )}
            {event.submissionFormat && (
              <div>
                <dt className="text-muted-foreground inline">Format: </dt>
                <dd className="inline">{event.submissionFormat}</dd>
              </div>
            )}
            {event.reviewModel && (
              <div>
                <dt className="text-muted-foreground inline">Review model: </dt>
                <dd className="inline">{event.reviewModel}</dd>
              </div>
            )}
            {event.submissionLanguage && (
              <div>
                <dt className="text-muted-foreground inline">Language: </dt>
                <dd className="inline">{event.submissionLanguage}</dd>
              </div>
            )}
            {event.tracks.length > 0 && (
              <div>
                <dt className="text-muted-foreground inline">Tracks: </dt>
                <dd className="inline">{event.tracks.join(", ")}</dd>
              </div>
            )}
            {event.paperTypes.length === 0 &&
              !event.pageLimit &&
              !event.submissionFormat &&
              !event.reviewModel &&
              !event.submissionLanguage &&
              event.tracks.length === 0 && (
                <p className="text-muted-foreground">No submission details recorded yet.</p>
              )}
          </dl>
        </div>
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 font-serif text-xl font-semibold">
            <ScrollText aria-hidden className="h-4 w-4" />
            Proceedings
          </h2>
          {event.proceedings ? (
            <div className="space-y-2 text-sm">
              <ProceedingsBadge status={event.proceedings.status} />
              {event.proceedings.publisher && (
                <p>
                  <span className="text-muted-foreground">Publisher: </span>
                  {event.proceedings.publisher}
                </p>
              )}
              {event.proceedings.indexing.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Indexing: </span>
                  {event.proceedings.indexing.join(", ")}
                </p>
              )}
              {event.proceedings.doiExpected != null && (
                <p>
                  <span className="text-muted-foreground">DOI expected: </span>
                  {event.proceedings.doiExpected ? "Yes" : "No"}
                </p>
              )}
              {event.proceedings.sourceUrl && (
                <SourceCitation url={event.proceedings.sourceUrl} label="Proceedings source" />
              )}
              {event.proceedings.notes && (
                <p className="text-muted-foreground">{event.proceedings.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Proceedings status has not been recorded yet.
            </p>
          )}
        </div>
      </section>

      {event.notes ? (
        <section aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="mb-2 font-serif text-xl font-semibold">
            Notes
          </h2>
          <p className="text-muted-foreground text-sm">{event.notes}</p>
        </section>
      ) : null}

      {event.sourceUrls.length > 0 && (
        <section aria-labelledby="sources-heading">
          <h2
            id="sources-heading"
            className="mb-2 flex items-center gap-1.5 font-serif text-xl font-semibold"
          >
            <Globe aria-hidden className="h-4 w-4" />
            Sources
          </h2>
          <ul className="space-y-1">
            {event.sourceUrls.map((url) => (
              <li key={url}>
                <SourceCitation url={url} label={url} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.auditTrail.length > 0 && (
        <section aria-labelledby="audit-heading">
          <h2 id="audit-heading" className="mb-2 font-serif text-xl font-semibold">
            Audit history
          </h2>
          <ul className="space-y-2 text-sm">
            {event.auditTrail.map((entry) => (
              <li key={entry.id} className="border-border bg-surface rounded-lg border p-3">
                <p>
                  <span className="font-medium">{entry.field}</span>:{" "}
                  {entry.previousValue ?? "(none)"} → {entry.newValue ?? "(removed)"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {entry.updateMethod}, {entry.confidence} confidence, {entry.reviewStatus} —{" "}
                  {entry.discoveredAt.slice(0, 10)}
                </p>
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
      className="border-border-strong bg-surface hover:border-secondary hover:text-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
    >
      {label}
      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
    </a>
  );
}
