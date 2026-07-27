import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { DataDisclaimer } from "./misc";

export function SiteFooter() {
  return (
    <footer className="border-border mt-16 border-t">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <DataDisclaimer />
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-4 text-sm">
          <p>
            {siteConfig.title} — built and maintained by {siteConfig.ownerName}.
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
            <Link href="/methodology" className="hover:text-accent">
              Methodology
            </Link>
            <Link href="/about" className="hover:text-accent">
              About
            </Link>
            {siteConfig.personalWebsiteUrl && (
              <a
                href={siteConfig.personalWebsiteUrl}
                className="hover:text-accent"
                target="_blank"
                rel="noopener noreferrer"
              >
                Personal site
              </a>
            )}
            {siteConfig.githubUrl && (
              <a
                href={siteConfig.githubUrl}
                className="hover:text-accent"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            )}
            {siteConfig.contactEmail && (
              <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-accent">
                Contact
              </a>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
