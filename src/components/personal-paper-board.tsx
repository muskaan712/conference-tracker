"use client";

import { useRef, useState } from "react";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  formatZodError,
  PAPER_STAGES,
  personalPaperExportSchema,
  personalPaperSchema,
  type PersonalPaper,
} from "@/lib/paper-schema";
import { PaperEditor } from "./paper-editor";
import { EmptyState } from "./misc";

const STORAGE_KEY = "ai-conference-tracker.my-papers.v1";

const COLOR_CLASSES: Record<PersonalPaper["colorLabel"], string> = {
  slate: "border-l-stone-400",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  sky: "border-l-sky-500",
  violet: "border-l-violet-500",
  rose: "border-l-rose-500",
};

export function PersonalPaperBoard() {
  const [papers, setPapers, hydrated] = useLocalStorage<PersonalPaper[]>(STORAGE_KEY, []);
  const [editing, setEditing] = useState<PersonalPaper | null | undefined>(undefined);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [importError, setImportError] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function savePaper(paper: PersonalPaper) {
    setPapers((prev) => {
      const exists = prev.some((p) => p.id === paper.id);
      return exists ? prev.map((p) => (p.id === paper.id ? paper : p)) : [...prev, paper];
    });
    setEditing(undefined);
  }

  function deletePaper(id: string) {
    setPapers((prev) => prev.filter((p) => p.id !== id));
  }

  function exportPapers() {
    const payload = { exportedAt: new Date().toISOString(), version: 1 as const, papers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-papers.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPapers(file: File) {
    setImportError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = personalPaperExportSchema.safeParse(json);
      if (!parsed.success) {
        const singlePapers = personalPaperSchema.array().safeParse(json);
        if (singlePapers.success) {
          setPapers(singlePapers.data);
          return;
        }
        setImportError(formatZodError(parsed.error));
        return;
      }
      setPapers(parsed.data.papers);
    } catch {
      setImportError(["The selected file is not valid JSON."]);
    }
  }

  if (!hydrated) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Add paper
        </button>
        <button
          type="button"
          onClick={exportPapers}
          disabled={papers.length === 0}
          className="border-border-strong inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          <Download aria-hidden className="h-4 w-4" />
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border-border-strong inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium"
        >
          <Upload aria-hidden className="h-4 w-4" />
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importPapers(file);
            e.target.value = "";
          }}
        />
        {papers.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3.5 py-1.5 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-300"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      {importError && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
        >
          <p className="font-medium">Import failed:</p>
          <ul className="mt-1 list-inside list-disc">
            {importError.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {confirmingClear && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmingClear(false)}
            aria-hidden
          />
          <div className="border-border bg-surface relative w-full max-w-sm rounded-xl border p-5 shadow-xl">
            <p className="font-serif text-lg font-semibold">Clear all papers?</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This deletes all {papers.length} paper{papers.length === 1 ? "" : "s"} stored in this
              browser. Export a backup first if you want to keep them.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="border-border-strong rounded-full border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPapers([]);
                  setConfirmingClear(false);
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <PaperEditor
          initial={editing ?? undefined}
          onSave={savePaper}
          onClose={() => setEditing(undefined)}
        />
      )}

      {papers.length === 0 ? (
        <EmptyState
          title="No papers yet"
          description="Add a paper to start tracking its stage, target conferences, and tasks — everything stays in this browser only."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {PAPER_STAGES.map((stage) => {
            const stagePapers = papers.filter((p) => p.stage === stage);
            if (stagePapers.length === 0) return null;
            return (
              <div key={stage}>
                <h2 className="mb-2 font-serif text-lg font-semibold">
                  {stage}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    ({stagePapers.length})
                  </span>
                </h2>
                <ul className="space-y-2">
                  {stagePapers.map((paper) => (
                    <li
                      key={paper.id}
                      className={`border-border bg-surface rounded-lg border border-l-4 p-3 ${COLOR_CLASSES[paper.colorLabel]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{paper.title || "Untitled paper"}</p>
                      </div>
                      {paper.codeName ? (
                        <p className="text-muted-foreground text-xs">{paper.codeName}</p>
                      ) : null}
                      {paper.currentTarget ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Target: {paper.currentTarget}
                        </p>
                      ) : null}
                      <div className="mt-2 flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditing(paper)}
                          className="text-accent underline underline-offset-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePaper(paper.id)}
                          className="text-red-700 underline underline-offset-2 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
