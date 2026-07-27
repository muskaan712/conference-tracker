import type { Metadata } from "next";
import { getAllEditions } from "@/lib/conferences";
import { GEOGRAPHIC_CATEGORIES } from "@/lib/schema";
import { RegionBadge } from "@/components/badges";
import { ConferenceCard } from "@/components/conference-card";
import { EmptyState } from "@/components/misc";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Regions",
  description:
    "Conferences grouped by region: Europe, Outside Europe, Online, Hybrid, and Location not announced.",
  alternates: { canonical: "/regions" },
};

export default function RegionsPage() {
  const editions = getAllEditions();
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Regions</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Region is derived from each edition&apos;s <em>announced venue</em>, never the
          organiser&apos;s headquarters. A conference can move regions from year to year.
        </p>
      </div>

      {GEOGRAPHIC_CATEGORIES.map((category) => {
        const group = editions.filter((e) => e.geographicCategory === category);
        return (
          <section key={category} aria-labelledby={`region-${category}`}>
            <div className="mb-4 flex items-center gap-3">
              <RegionBadge category={category} />
              <h2 id={`region-${category}`} className="font-serif text-xl font-semibold">
                {group.length} conference{group.length === 1 ? "" : "s"}
              </h2>
            </div>
            {group.length === 0 ? (
              <EmptyState title={`No conferences currently in "${category}"`} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.map((edition) => (
                  <ConferenceCard key={edition.slug} edition={edition} now={now} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
