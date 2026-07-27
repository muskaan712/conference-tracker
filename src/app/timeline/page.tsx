import type { Metadata } from "next";
import { getAllEditions } from "@/lib/conferences";
import { getAllEvents } from "@/lib/events";
import { TimelineView } from "@/components/timeline-view";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Timeline",
  description: "Full chronological timeline of AI/ML conference deadlines, grouped by month.",
  alternates: { canonical: "/timeline" },
};

export default function TimelinePage() {
  const editions = getAllEditions();
  const events = getAllEvents();
  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground mt-1">
          Every tracked deadline, in chronological order — main conference and associated events.
        </p>
      </div>
      <TimelineView editions={editions} events={events} now={now} />
    </div>
  );
}
