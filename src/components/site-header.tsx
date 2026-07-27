import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";
import { AccountMenu } from "./auth/account-menu";

const NAV_LINKS = [
  { href: "/conferences", label: "Conferences" },
  { href: "/events", label: "Workshops & Events" },
  { href: "/timeline", label: "Timeline" },
  { href: "/tiers", label: "Tiers" },
  { href: "/regions", label: "Regions" },
  { href: "/planner", label: "Planner" },
  { href: "/my-papers", label: "My Papers" },
  { href: "/updates", label: "Updates" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-serif text-lg font-semibold"
        >
          <CalendarClock aria-hidden className="text-accent h-5 w-5" />
          {siteConfig.title}
        </Link>
        <nav
          aria-label="Primary"
          className="flex flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto text-sm whitespace-nowrap [&::-webkit-scrollbar]:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:bg-accent-soft hover:text-accent rounded-md px-2.5 py-1.5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <AccountMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
