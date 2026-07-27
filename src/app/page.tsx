import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTrackerStats, getUpcomingDeadlines } from "@/lib/conferences";
import { TrackerStatistics } from "@/components/tracker-statistics";
import { DeadlineTimeline } from "@/components/deadline-timeline";
import { EmptyState } from "@/components/misc";
import { siteConfig } from "@/lib/site-config";

export const revalidate = 21600;

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

export default function HomePage() {
  const now = new Date();
  const stats = getTrackerStats(now);
  const upcoming = getUpcomingDeadlines(now, 10);

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            {siteConfig.title}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">{siteConfig.description}</p>
        </div>
        <TrackerStatistics stats={stats} />
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
    </div>
  );
}
