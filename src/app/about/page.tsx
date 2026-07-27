import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { DataDisclaimer } from "@/components/misc";

export const metadata: Metadata = {
  title: "About",
  description: "What this project is, who it's for, and its disclaimer.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">About</h1>
        <p className="text-muted-foreground mt-1">{siteConfig.description}</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Who this is for</h2>
        <p className="text-foreground/90 text-sm">
          Researchers working in AI, machine learning, NLP, computer vision, information retrieval,
          data mining, medical AI, responsible/trustworthy AI, AI systems, and human-centred AI who
          want one place to see deadlines, rankings, and locations across the conferences they care
          about — and to plan resubmissions without opening two dozen tabs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Who maintains it</h2>
        <p className="text-foreground/90 text-sm">
          {siteConfig.ownerName}
          {siteConfig.personalWebsiteUrl && (
            <>
              {" "}
              (
              <a
                href={siteConfig.personalWebsiteUrl}
                className="text-accent underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                personal site
              </a>
              )
            </>
          )}
          {siteConfig.githubUrl && (
            <>
              {" "}
              — source on{" "}
              <a
                href={siteConfig.githubUrl}
                className="text-accent underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              .
            </>
          )}
          {siteConfig.contactEmail && (
            <>
              {" "}
              — contact:{" "}
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-accent underline underline-offset-2"
              >
                {siteConfig.contactEmail}
              </a>
            </>
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Disclaimer</h2>
        <DataDisclaimer />
        <p className="text-foreground/90 text-sm">
          This is an independent, unofficial tracker. It is not affiliated with, endorsed by, or
          operated on behalf of any conference, society, or ranking body it references. See the{" "}
          <a href="/methodology" className="text-accent underline underline-offset-2">
            methodology
          </a>{" "}
          page for how data is sourced and verified.
        </p>
      </section>
    </div>
  );
}
