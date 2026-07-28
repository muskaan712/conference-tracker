"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Portals must not render during SSR/the first client render (there's no
// document.body match to hydrate against), so — same pattern as
// ThemeToggle — we read "are we mounted on the client" via
// useSyncExternalStore rather than a setState-in-effect, which avoids an
// extra cascading render.
function subscribeNever() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getServerMountedSnapshot() {
  return false;
}

export interface DialogProps {
  /** Called when the dialog should close — Escape, backdrop click, or the close button. */
  onClose: () => void;
  /** Visible heading, and the accessible name for the dialog. */
  title: string;
  children: React.ReactNode;
  /** Use "alertdialog" for confirmation prompts that interrupt a destructive action. */
  role?: "dialog" | "alertdialog";
  /** Extra classes for the panel, e.g. a wider max-width for larger forms. */
  className?: string;
  /** Hide the header's close button (rare — e.g. a dialog with no dismiss-without-choosing action). */
  hideCloseButton?: boolean;
}

/**
 * Shared full-screen modal shell. Centers on tall viewports, aligns near the
 * top with safe padding on short/mobile ones, and always scrolls internally
 * within a dvh-based max-height so content never hides behind mobile browser
 * chrome. Handles Escape-to-close, backdrop-click-to-close, background-scroll
 * lock, a focus trap, and focus restoration to whatever triggered it.
 */
export function Dialog({
  onClose,
  title,
  children,
  role = "dialog",
  className,
  hideCloseButton,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(
    subscribeNever,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );

  useEffect(() => {
    if (!mounted) return;

    const triggerElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (triggerElement instanceof HTMLElement) triggerElement.focus();
    };
  }, [onClose, mounted]);

  if (!mounted || typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          ref={panelRef}
          onClick={(event) => event.stopPropagation()}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "border-border bg-surface relative my-4 max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-xl border shadow-xl outline-none sm:my-0",
            className,
          )}
        >
          <div className="border-border bg-surface sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b p-5 pb-4">
            <h2 id={titleId} className="font-serif text-lg font-semibold">
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="hover:bg-accent-soft -mr-1.5 rounded-full p-1.5"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="p-5 pt-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
