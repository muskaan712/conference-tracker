"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";
import { AccountMenu } from "./auth/account-menu";
import { cn } from "@/lib/cn";

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

function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile panel automatically on navigation — adjusting state
  // during render (React's recommended pattern for "reset state when a prop
  // changes") rather than in an effect, which would cause an extra render.
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (trackedPathname !== pathname) {
    setTrackedPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setMobileOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileOpen]);

  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-serif text-lg font-semibold"
        >
          <CalendarClock aria-hidden className="text-accent h-5 w-5" />
          {siteConfig.title}
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 text-sm lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActiveHref(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1.5 whitespace-nowrap",
                  active
                    ? "bg-accent-soft text-accent font-semibold"
                    : "text-muted-foreground hover:bg-accent-soft hover:text-accent",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:ml-0">
          <AccountMenu />
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="border-border-strong bg-surface hover:border-accent inline-flex items-center justify-center rounded-full border p-2 lg:hidden"
          >
            {mobileOpen ? (
              <X aria-hidden className="h-5 w-5" />
            ) : (
              <Menu aria-hidden className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id={menuId}
          ref={panelRef}
          className="border-border bg-background max-h-[calc(100dvh-4rem)] overflow-y-auto border-t lg:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm"
          >
            {NAV_LINKS.map((link) => {
              const active = isActiveHref(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2.5",
                    active
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-muted-foreground hover:bg-accent-soft hover:text-accent",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
