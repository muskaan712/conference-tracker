import Link from "next/link";
import { MapPin } from "lucide-react";
import type { CoLocatedEvent, ConferenceEdition } from "@/lib/schema";
import { RESEARCH_AREA_LABELS } from "@/lib/schema";
import { deriveConferenceStatus } from "@/lib/status";
import { resolveDateInstant } from "@/lib/datetime";
import { resolveEventLocation } from "@/lib/event-location";
import {
  EventTypeBadge,
  EventLifecycleBadge,
  StatusBadge,
  ParentTierBadge,
  TierBadge,
} from "./badges";
import { Countdown } from "./countdown";

function nextActiveDate(event: CoLocatedEvent, now: Date) {
  const active = event.dates
    .filter((d) => d.verificationStatus !== "previous-cycle")
    .map((d) => ({ d, t: resolveDateInstant(d).getTime() }))
    .filter(({ t }) => t >= now.getTime())
    .sort((a, b) => a.t - b.t);
  return active[0]?.d;
}

export function EventCard({
  event,
  parent,
  now = new Date(),
}: {
  event: CoLocatedEvent;
  parent?: ConferenceEdition;
  now?: Date;
}) {
  const status = deriveConferenceStatus(event.dates, now);
  const nextDate = nextActiveDate(event, now);
  const location = resolveEventLocation(event, parent);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group border-border bg-surface hover:border-secondary flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground group-hover:text-secondary font-serif text-lg leading-tight font-semibold">
            {event.acronym ?? event.name}
          </p>
          <p className="text-muted-foreground line-clamp-1 text-sm">{event.name}</p>
          {parent ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              at {parent.acronym} {parent.editionYear}
            </p>
          ) : null}
        </div>
        <TierBadge tier={event.ranking.tier} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <EventTypeBadge type={event.type} />
        <EventLifecycleBadge status={event.lifecycleStatus} />
        {parent ? <ParentTierBadge tier={parent.ranking.tier} /> : null}
      </div>

      {location.city || location.venueName ? (
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <MapPin aria-hidden className="h-3 w-3" />
          {location.venueName ? `${location.venueName}, ` : ""}
          {location.city}
          {location.inherited ? " (inherited)" : " (event-specific)"}
        </span>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {event.researchAreas.slice(0, 3).map((area) => (
          <span
            key={area}
            className="bg-secondary-soft text-foreground/80 rounded-full px-2 py-0.5 text-[11px]"
          >
            {RESEARCH_AREA_LABELS[area]}
          </span>
        ))}
      </div>

      <div className="border-border mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <StatusBadge status={status} />
        {nextDate ? (
          <Countdown date={nextDate} label={nextDate.label} now={now} />
        ) : (
          <span className="text-muted-foreground text-sm">No upcoming dates</span>
        )}
      </div>
    </Link>
  );
}
