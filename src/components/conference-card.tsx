import Link from "next/link";
import type { ConferenceEdition } from "@/lib/schema";
import { deriveConferenceStatus } from "@/lib/status";
import { resolveDateInstant } from "@/lib/datetime";
import { RESEARCH_AREA_LABELS } from "@/lib/schema";
import { TierBadge, RegionBadge, CountryFlag, StatusBadge } from "./badges";
import { Countdown } from "./countdown";
import { MapPin } from "lucide-react";

function nextActiveDate(edition: ConferenceEdition, now: Date) {
  const active = edition.dates
    .filter((d) => d.verificationStatus !== "previous-cycle")
    .map((d) => ({ d, t: resolveDateInstant(d).getTime() }))
    .filter(({ t }) => t >= now.getTime())
    .sort((a, b) => a.t - b.t);
  return active[0]?.d;
}

export function ConferenceCard({
  edition,
  now = new Date(),
}: {
  edition: ConferenceEdition;
  now?: Date;
}) {
  const status = deriveConferenceStatus(edition.dates, now);
  const nextDate = nextActiveDate(edition, now);

  return (
    <Link
      href={`/conferences/${edition.slug}`}
      className="group border-border bg-surface hover:border-accent flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground group-hover:text-accent font-serif text-lg leading-tight font-semibold">
            {edition.acronym} {edition.editionYear}
          </p>
          <p className="text-muted-foreground line-clamp-1 text-sm">{edition.name}</p>
        </div>
        <TierBadge tier={edition.ranking.tier} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RegionBadge category={edition.geographicCategory} />
        {edition.countryCode ? <CountryFlag countryCode={edition.countryCode} /> : null}
        {edition.city ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <MapPin aria-hidden className="h-3 w-3" />
            {edition.city}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        {edition.researchAreas.slice(0, 3).map((area) => (
          <span
            key={area}
            className="bg-accent-soft text-foreground/80 rounded-full px-2 py-0.5 text-[11px]"
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
