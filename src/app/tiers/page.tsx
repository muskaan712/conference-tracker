import type { Metadata } from "next";
import { getAllEditions } from "@/lib/conferences";
import { TIERS } from "@/lib/schema";
import { TierBadge } from "@/components/badges";
import { ConferenceCard } from "@/components/conference-card";
import { EmptyState } from "@/components/misc";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Tiers",
  description: "Conferences grouped by ranking tier: A*, A, B, C, and Unclassified.",
  alternates: { canonical: "/tiers" },
};

export default function TiersPage() {
  const editions = getAllEditions();
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Tiers</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Grouped in canonical order A* → A → B → C → Unclassified. Tiers are only shown when a
          citable ranking source is on file — see the{" "}
          <a href="/methodology" className="text-accent underline underline-offset-2">
            methodology
          </a>{" "}
          page for how these are assigned.
        </p>
      </div>

      {TIERS.map((tier) => {
        const group = editions.filter((e) => e.ranking.tier === tier);
        return (
          <section key={tier} aria-labelledby={`tier-${tier}`}>
            <div className="mb-4 flex items-center gap-3">
              <TierBadge tier={tier} />
              <h2 id={`tier-${tier}`} className="font-serif text-xl font-semibold">
                {group.length} conference{group.length === 1 ? "" : "s"}
              </h2>
            </div>
            {group.length === 0 ? (
              <EmptyState title={`No conferences currently in Tier ${tier}`} />
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
