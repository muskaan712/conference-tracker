import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getAutomationStatus, resolveScanStatus } from "@/lib/automation-status";
import { getTrackerStats, getUpcomingDeadlines } from "@/lib/conferences";
import { getAllEvents } from "@/lib/events";
import { getEditionBySlug } from "@/lib/conferences";
import { resolveDateInstant } from "@/lib/datetime";
import { TrackerStatistics } from "@/components/tracker-statistics";
import {
  DeadlineTimeline,
  conferenceTimelineEntry,
  eventTimelineEntry,
} from "@/components/deadline-timeline";
import { EmptyState } from "@/components/misc";
import { siteConfig } from "@/lib/site-config";

/**
 * One hour, matching AUTOMATION_STATUS_REVALIDATE_SECONDS. The page is still
 * statically prerendered; it just re-renders hourly, because Next lowers a
 * route's revalidation window to the shortest of any fetch it makes and the
 * "Last successful scan" tile fetches GitHub's run metadata hourly. Kept as a
 * literal because the value must be statically analysable.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Overview",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const QUICK_LINKS = [
  { href: "/conferences", label: "Browse all conferences" },
  { href: "/timeline", label: "Full deadline timeline" },
  { href: "/tiers", label: "Grouped by tier" },
  { href: "/regions", label: "Grouped by region" },
  { href: "/planner", label: "Plan a resubmission" },
];

export default async function HomePage() {
  const now = new Date();
  const stats = getTrackerStats(now);
  // Never throws: a GitHub outage or rate limit resolves to the edition-level
  // fallback rather than taking the homepage down with it.
  const scanStatus = resolveScanStatus(await getAutomationStatus(), stats.lastEditionScan);
  const upcoming = getUpcomingDeadlines(now, 10).map((u) =>
    conferenceTimelineEntry(u.edition, u.date),
  );

  const upcomingEventDeadlines = getAllEvents()
    .flatMap((event) =>
      event.dates
        .filter((d) => d.verificationStatus !== "previous-cycle")
        .filter((d) => resolveDateInstant(d).getTime() >= now.getTime())
        .map((date) =>
          eventTimelineEntry(event, date, getEditionBySlug(event.parentConferenceEditionSlug)),
        ),
    )
    .sort((a, b) => resolveDateInstant(a.date).getTime() - resolveDateInstant(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            {siteConfig.title}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">{siteConfig.description}</p>
        </div>
        <TrackerStatistics stats={stats} scanStatus={scanStatus} />
        <nav aria-label="Quick links" className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-border-strong bg-surface hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium"
            >
              {link.label}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          ))}
        </nav>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">Next deadlines</h2>
          <Link href="/timeline" className="text-accent text-sm font-medium hover:underline">
            View full timeline →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming deadlines recorded yet"
            description="Check back after the next automated scan."
          />
        ) : (
          <DeadlineTimeline entries={upcoming} now={now} />
        )}
      </section>

      {upcomingEventDeadlines.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold">Upcoming workshops &amp; events</h2>
            <Link href="/events" className="text-secondary text-sm font-medium hover:underline">
              Browse all events →
            </Link>
          </div>
          <ul className="divide-border bg-surface border-border divide-y rounded-xl border">
            {upcomingEventDeadlines.map((entry) => {
              if (entry.kind !== "event") return null;
              return (
                <li key={`${entry.event.slug}-${entry.date.id}`} className="p-3">
                  <Link
                    href={`/events/${entry.event.slug}`}
                    className="hover:text-secondary font-medium"
                  >
                    {entry.event.acronym ?? entry.event.name}
                  </Link>
                  <span className="text-muted-foreground text-sm"> — {entry.date.label}</span>
                  {entry.parentEdition ? (
                    <span className="text-muted-foreground text-xs">
                      {" "}
                      (at {entry.parentEdition.acronym} {entry.parentEdition.editionYear})
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
