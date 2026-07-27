import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { AuditEntryWithConference } from "@/lib/conferences";
import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/datetime";
import { VerificationBadge } from "./badges";
import { SourceCitation } from "./misc";

const CONFIDENCE_CLASSES: Record<string, string> = {
  high: "text-emerald-700 dark:text-emerald-300",
  medium: "text-amber-700 dark:text-amber-300",
  low: "text-red-700 dark:text-red-300",
};

export function RecentUpdates({ entries }: { entries: AuditEntryWithConference[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No recorded changes yet. Once the weekly automation merges reviewed updates, they will
        appear here.
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/conferences/${entry.conferenceSlugResolved}`}
              className="hover:text-accent font-medium"
            >
              {entry.conferenceAcronym} — {entry.field}
            </Link>
            <span className="text-muted-foreground text-xs">
              {formatInTimeZone(
                new Date(entry.discoveredAt),
                DEFAULT_DISPLAY_TIMEZONE,
                "d MMM yyyy",
              )}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {entry.previousValue ?? "(none)"} → {entry.newValue ?? "(removed)"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <VerificationBadge status={entry.verificationStatus} />
            <span className={`text-xs font-medium ${CONFIDENCE_CLASSES[entry.confidence]}`}>
              {entry.confidence} confidence
            </span>
            <span className="text-muted-foreground text-xs">{entry.updateMethod}</span>
            <span className="text-muted-foreground text-xs">{entry.reviewStatus}</span>
            <SourceCitation url={entry.sourceUrl} />
          </div>
        </li>
      ))}
    </ul>
  );
}
