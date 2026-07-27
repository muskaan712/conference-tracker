import { CheckCircle2, XCircle } from "lucide-react";
import type { PlannerResult } from "@/lib/planner";
import { TierBadge, RegionBadge, CountryFlag, DeadlineTypeBadge } from "./badges";
import { TimezoneDisplay } from "./timezone-display";
import { cn } from "@/lib/cn";

const ASSESSMENT_CLASSES: Record<string, string> = {
  Comfortable:
    "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  Feasible:
    "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  Tight:
    "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  "Very tight":
    "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  Unrealistic:
    "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
};

function CompatibilityDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {ok ? (
        <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle aria-hidden className="h-3.5 w-3.5 text-stone-400" />
      )}
      {label}
    </span>
  );
}

export function PlannerResultCard({ result }: { result: PlannerResult }) {
  const {
    edition,
    targetDate,
    abstractDate,
    daysAvailable,
    abstractRequired,
    compatibility,
    assessment,
  } = result;
  return (
    <li className="border-border bg-surface rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-semibold">
            {edition.acronym} {edition.editionYear}
          </p>
          <p className="text-muted-foreground text-sm">{edition.name}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold",
            ASSESSMENT_CLASSES[assessment],
          )}
        >
          {assessment}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TierBadge tier={edition.ranking.tier} />
        <RegionBadge category={edition.geographicCategory} />
        {edition.countryCode ? <CountryFlag countryCode={edition.countryCode} /> : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <DeadlineTypeBadge type={targetDate.type} />
          <div className="mt-1.5">
            <TimezoneDisplay date={targetDate} />
          </div>
        </div>
        {abstractDate ? (
          <div>
            <DeadlineTypeBadge type={abstractDate.type} />
            <div className="mt-1.5">
              <TimezoneDisplay date={abstractDate} />
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-sm">
        <strong>{daysAvailable}</strong> day{daysAvailable === 1 ? "" : "s"} available after your
        notification + buffer.{" "}
        {abstractRequired
          ? "Abstract registration is required before the full paper deadline."
          : ""}
      </p>

      <div className="border-border mt-3 flex flex-wrap gap-3 border-t pt-3">
        <CompatibilityDot ok={compatibility.topic} label="Topic" />
        <CompatibilityDot ok={compatibility.format} label="Format" />
        <CompatibilityDot ok={compatibility.tier} label="Tier" />
        <CompatibilityDot ok={compatibility.geography} label="Geography" />
      </div>
    </li>
  );
}
