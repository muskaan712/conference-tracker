import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllEvents } from "@/lib/events";
import { getAllEditions } from "@/lib/conferences";
import { EventDirectory } from "@/components/event-directory";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Workshops & Associated Events",
  description:
    "Search and filter workshops, tutorials, shared tasks, competitions, and other events co-located with tracked AI/ML conferences.",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  const events = getAllEvents();
  const editions = getAllEditions();
  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Workshops &amp; associated events
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {`${events.length} tracked workshops, tutorials, shared tasks, competitions, and other events co-located with a specific edition of a tracked conference. Every event's ranking is assessed independently of its parent conference's tier.`}
        </p>
      </div>
      {events.length === 0 ? (
        <p className="border-border-strong bg-surface rounded-xl border border-dashed px-6 py-14 text-center text-sm">
          No associated events are tracked yet. See{" "}
          <a href="/methodology" className="text-accent hover:underline">
            methodology
          </a>{" "}
          for how these are added.
        </p>
      ) : (
        <Suspense>
          <EventDirectory events={events} editions={editions} now={now} />
        </Suspense>
      )}
    </div>
  );
}
