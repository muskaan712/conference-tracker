import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllEditions } from "@/lib/conferences";
import { ConferenceDirectory } from "@/components/conference-directory";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Conferences",
  description:
    "Search and filter every tracked AI/ML conference by tier, region, research area, deadline, and more.",
  alternates: { canonical: "/conferences" },
};

export default function ConferencesPage() {
  const editions = getAllEditions();
  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Conferences</h1>
        <p className="text-muted-foreground mt-1">
          {editions.length} tracked editions across AI, ML, NLP, vision, IR, data mining, medical AI
          and human-centred AI.
        </p>
      </div>
      <Suspense>
        <ConferenceDirectory editions={editions} now={now} />
      </Suspense>
    </div>
  );
}
