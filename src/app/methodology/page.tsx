import type { Metadata } from "next";
import { VERIFICATION_STATUSES } from "@/lib/schema";
import { VerificationBadge } from "@/components/badges";
import { DataDisclaimer } from "@/components/misc";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How rankings are assigned, how regions are classified, what each verification state means, and how the weekly automation works.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-muted-foreground mt-1">
          How this tracker decides what to show, and how much to trust it.
        </p>
      </div>

      <DataDisclaimer />

      <section aria-labelledby="ranking-heading" className="space-y-3">
        <h2 id="ranking-heading" className="font-serif text-2xl font-semibold">
          Ranking methodology
        </h2>
        <p>
          Tiers (A*, A, B, C, Unclassified) are never assigned by this project&apos;s own judgement.
          Each conference&apos;s tier is either taken from a citable public ranking source — most
          commonly the{" "}
          <a
            href="https://portal.core.edu.au/conf-ranks/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            ICORE / CORE Conference Rankings Portal
          </a>{" "}
          — or left as <strong>Unclassified</strong> when no reliable source has been checked yet.
          An Unclassified tier is not a negative judgement about a venue; it just means we have not
          (yet) recorded a citable source for it. Every ranked entry stores the source name, a link
          to it, and the date it was checked, so you can verify it yourself.
        </p>
      </section>

      <section aria-labelledby="region-heading" className="space-y-3">
        <h2 id="region-heading" className="font-serif text-2xl font-semibold">
          Europe / Outside Europe classification
        </h2>
        <p>
          Region is based on the <strong>announced venue of that specific edition</strong> — never
          the organising society&apos;s headquarters or where past editions were held. A conference
          like NeurIPS or ICML can be &quot;Outside Europe&quot; one year and &quot;Europe&quot; the
          next simply because the venue moved. If an edition is fully online, it is classified as{" "}
          <strong>Online</strong>; if it mixes in-person and remote participation, it is{" "}
          <strong>Hybrid</strong>; if no venue has been announced yet, it is{" "}
          <strong>Location not announced</strong> rather than guessed.
        </p>
      </section>

      <section aria-labelledby="verification-heading" className="space-y-3">
        <h2 id="verification-heading" className="font-serif text-2xl font-semibold">
          Verification states
        </h2>
        <p>Every date and location field carries one of the following states:</p>
        <ul className="space-y-3">
          {VERIFICATION_STATUSES.map((status) => (
            <li key={status} className="flex items-start gap-3">
              <VerificationBadge status={status} className="mt-0.5" />
              <span className="text-muted-foreground text-sm">
                {verificationExplanation(status)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="automation-heading" className="space-y-3">
        <h2 id="automation-heading" className="font-serif text-2xl font-semibold">
          Weekly automation and human review
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            A scheduled GitHub Action runs discovery scripts weekly (and on demand) against a
            registry of per-series sources — mostly each conference&apos;s own official site.
          </li>
          <li>
            Discovered candidate dates and fields are diffed against what is currently stored.
          </li>
          <li>Every candidate is validated against the same Zod schema used to build the site.</li>
          <li>
            A human-readable Markdown report is generated summarising new conferences, changed
            deadlines, location changes, ranking changes, and anything that failed validation or
            looks suspicious.
          </li>
          <li>
            The changes are committed to a branch named{" "}
            <code>automated/conference-update-YYYY-MM-DD</code> and opened as a pull request — never
            written to <code>main</code> directly.
          </li>
          <li>
            A human reviews the PR, checks the cited sources, and merges (or edits, or rejects) it.
            Only after merge does a change appear on the public site and in the{" "}
            <code>/updates</code> audit trail.
          </li>
        </ol>
        <p className="text-muted-foreground text-sm">
          <strong>Last successful scan</strong> on the homepage is the start time of the most recent
          successful run of that workflow, whether it was the weekly schedule or a manual run — both
          run the identical scanner. Most runs find nothing new and correctly change no data, so
          that date moves even when the tracker does not. It is a different thing from{" "}
          <strong>Tracker data last verified</strong>, which is when a human last confirmed the data
          itself and is never updated by automation.
        </p>
      </section>
    </div>
  );
}

function verificationExplanation(status: (typeof VERIFICATION_STATUSES)[number]): string {
  switch (status) {
    case "official":
      return "Taken directly from the conference's own official site or call for papers.";
    case "verified":
      return "Cross-checked against an official source, even if the value itself came from elsewhere first.";
    case "tentative":
      return "Published but explicitly marked as subject to change by the source itself.";
    case "previous-cycle":
      return "Carried over from an earlier edition purely as a rough reference — never a confirmed date for the current cycle.";
    case "discovered":
      return "Found by the automated scanner but not yet reviewed by a human. Treat with caution.";
    case "conflicting":
      return "Two or more sources disagree; shown so you know to double-check rather than being silently resolved.";
    case "unverified":
      return "Recorded but not checked against any source yet.";
  }
}
