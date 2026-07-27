"use client";

import { X } from "lucide-react";

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilterChips({
  chips,
  onClearAll,
}: {
  chips: FilterChip[];
  onClearAll?: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="border-border-strong bg-surface text-foreground hover:border-accent hover:text-accent inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
        >
          {chip.label}
          <X aria-hidden className="h-3 w-3" />
          <span className="sr-only">Remove filter {chip.label}</span>
        </button>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-accent text-xs font-medium underline underline-offset-2"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
