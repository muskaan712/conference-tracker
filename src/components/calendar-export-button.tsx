"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy } from "lucide-react";
import { downloadIcsFile } from "@/lib/ics";
import { cn } from "@/lib/cn";

export function CalendarExportButton({
  content,
  filename,
  label = "Add to calendar",
  className,
  variant = "default",
}: {
  content: string;
  filename: string;
  label?: string;
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <button
      type="button"
      onClick={() => downloadIcsFile(content, filename)}
      className={cn(
        "border-border-strong bg-surface text-foreground hover:bg-accent-soft hover:text-accent inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        variant === "default" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
        className,
      )}
    >
      <CalendarPlus aria-hidden className={variant === "default" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {label}
    </button>
  );
}

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable; silently ignore.
        }
      }}
      className={cn(
        "border-border-strong bg-surface text-foreground hover:bg-accent-soft hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="h-4 w-4" />
      ) : (
        <Copy aria-hidden className="h-4 w-4" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
