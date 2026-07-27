"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  PAPER_COLOR_LABELS,
  PAPER_STAGES,
  PAPER_TARGET_TYPES,
  PAPER_TARGET_TYPE_LABELS,
  type PaperStage,
  type PaperTargetType,
  type PersonalPaper,
} from "@/lib/paper-schema";
import {
  RESEARCH_AREA_LABELS,
  RESEARCH_AREAS,
  TIERS,
  type ResearchArea,
  type Tier,
} from "@/lib/schema";
import type { GeographicPreference } from "@/lib/planner";

function newId(): string {
  return `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyPaper(): PersonalPaper {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "",
    codeName: "",
    authors: [],
    researchAreas: [],
    currentTarget: undefined,
    fallbackConferences: [],
    minAcceptableTier: "Unclassified",
    europePreference: "none",
    stage: "Idea",
    importantDates: [],
    tasks: [],
    notes: "",
    colorLabel: "slate",
    createdAt: now,
    updatedAt: now,
  };
}

export function PaperEditor({
  initial,
  onSave,
  onClose,
}: {
  initial?: PersonalPaper;
  onSave: (paper: PersonalPaper) => void;
  onClose: () => void;
}) {
  const [paper, setPaper] = useState<PersonalPaper>(initial ?? emptyPaper());
  const [authorsText, setAuthorsText] = useState(paper.authors.join(", "));
  const [fallbackText, setFallbackText] = useState(paper.fallbackConferences.join(", "));

  function toggleArea(area: ResearchArea) {
    setPaper((p) => ({
      ...p,
      researchAreas: p.researchAreas.includes(area)
        ? p.researchAreas.filter((a) => a !== area)
        : [...p.researchAreas, area],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paper.title.trim()) return;
    onSave({
      ...paper,
      authors: authorsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      fallbackConferences: fallbackText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit paper" : "Add paper"}
        className="border-border bg-surface relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">
            {initial ? "Edit paper" : "Add paper"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-accent-soft rounded-full p-1.5"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="paper-title" className="mb-1 block text-sm font-medium">
              Title
            </label>
            <input
              id="paper-title"
              required
              value={paper.title}
              onChange={(e) => setPaper((p) => ({ ...p, title: e.target.value }))}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="paper-codename" className="mb-1 block text-sm font-medium">
              Code name
            </label>
            <input
              id="paper-codename"
              value={paper.codeName ?? ""}
              onChange={(e) => setPaper((p) => ({ ...p, codeName: e.target.value }))}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="paper-authors" className="mb-1 block text-sm font-medium">
              Authors (comma separated)
            </label>
            <input
              id="paper-authors"
              value={authorsText}
              onChange={(e) => setAuthorsText(e.target.value)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium">Research areas</legend>
            <div className="flex flex-wrap gap-1.5">
              {RESEARCH_AREAS.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-pressed={paper.researchAreas.includes(a)}
                  onClick={() => toggleArea(a)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    paper.researchAreas.includes(a)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-strong"
                  }`}
                >
                  {RESEARCH_AREA_LABELS[a]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="paper-stage" className="mb-1 block text-sm font-medium">
                Stage
              </label>
              <select
                id="paper-stage"
                value={paper.stage}
                onChange={(e) => setPaper((p) => ({ ...p, stage: e.target.value as PaperStage }))}
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
              >
                {PAPER_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paper-color" className="mb-1 block text-sm font-medium">
                Colour label
              </label>
              <select
                id="paper-color"
                value={paper.colorLabel}
                onChange={(e) =>
                  setPaper((p) => ({
                    ...p,
                    colorLabel: e.target.value as PersonalPaper["colorLabel"],
                  }))
                }
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm capitalize"
              >
                {PAPER_COLOR_LABELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div>
              <label htmlFor="paper-target-type" className="mb-1 block text-sm font-medium">
                Target type
              </label>
              <select
                id="paper-target-type"
                value={paper.currentTarget?.type ?? "main-conference"}
                onChange={(e) =>
                  setPaper((p) => ({
                    ...p,
                    currentTarget: {
                      type: e.target.value as PaperTargetType,
                      label: p.currentTarget?.label ?? "",
                      slug: p.currentTarget?.slug,
                    },
                  }))
                }
                className="border-border-strong bg-surface w-full rounded-md border px-2 py-2 text-sm"
              >
                {PAPER_TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PAPER_TARGET_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paper-target" className="mb-1 block text-sm font-medium">
                Current target
              </label>
              <input
                id="paper-target"
                value={paper.currentTarget?.label ?? ""}
                onChange={(e) =>
                  setPaper((p) => ({
                    ...p,
                    currentTarget: e.target.value
                      ? {
                          type: p.currentTarget?.type ?? "main-conference",
                          label: e.target.value,
                          slug: p.currentTarget?.slug,
                        }
                      : undefined,
                  }))
                }
                placeholder="e.g. NeurIPS 2026, or a workshop name"
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="paper-fallbacks" className="mb-1 block text-sm font-medium">
              Fallback conferences (comma separated)
            </label>
            <input
              id="paper-fallbacks"
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="paper-min-tier" className="mb-1 block text-sm font-medium">
                Minimum acceptable tier
              </label>
              <select
                id="paper-min-tier"
                value={paper.minAcceptableTier}
                onChange={(e) =>
                  setPaper((p) => ({ ...p, minAcceptableTier: e.target.value as Tier }))
                }
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paper-geo" className="mb-1 block text-sm font-medium">
                Geographic preference
              </label>
              <select
                id="paper-geo"
                value={paper.europePreference}
                onChange={(e) =>
                  setPaper((p) => ({
                    ...p,
                    europePreference: e.target.value as GeographicPreference,
                  }))
                }
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="none">No preference</option>
                <option value="europe-only">Europe only</option>
                <option value="outside-europe">Outside Europe</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="paper-notes" className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              id="paper-notes"
              rows={3}
              value={paper.notes ?? ""}
              onChange={(e) => setPaper((p) => ({ ...p, notes: e.target.value }))}
              className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-border-strong rounded-full border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-semibold"
          >
            Save paper
          </button>
        </div>
      </form>
    </div>
  );
}
