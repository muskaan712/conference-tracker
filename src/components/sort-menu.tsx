"use client";

import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/sorting";
import { ArrowUpDown } from "lucide-react";

export function SortMenu({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <ArrowUpDown aria-hidden className="text-muted-foreground h-4 w-4" />
      <span className="sr-only">Sort conferences by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="border-border-strong bg-surface text-foreground rounded-md border px-2 py-1.5 text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
