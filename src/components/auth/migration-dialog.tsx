"use client";

import { useState } from "react";
import type { MigrationChoice, MigrationPreview } from "@/lib/firebase/migration";

export function MigrationDialog({
  preview,
  onResolve,
}: {
  preview: MigrationPreview;
  onResolve: (choice: MigrationChoice, keepLocalCopy: boolean) => void;
}) {
  const [keepLocalCopy, setKeepLocalCopy] = useState(true);
  const [busy, setBusy] = useState(false);

  function choose(choice: MigrationChoice) {
    setBusy(true);
    onResolve(choice, keepLocalCopy);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Guest data found"
        className="border-border bg-surface relative w-full max-w-md rounded-xl border p-5 shadow-xl"
      >
        <h2 className="font-serif text-lg font-semibold">Guest papers found in this browser</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This browser has <strong>{preview.localPaperCount}</strong> paper
          {preview.localPaperCount === 1 ? "" : "s"} saved as a guest, and your account already has{" "}
          <strong>{preview.cloudPaperCount}</strong> saved in the cloud. Choose what to do —{" "}
          <strong>{preview.localOnlyCount}</strong> of the browser&apos;s papers aren&apos;t in your
          account yet.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Nothing is uploaded automatically. Whatever you choose becomes available on any device you
          sign in on afterwards.
        </p>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={keepLocalCopy}
            onChange={(e) => setKeepLocalCopy(e.target.checked)}
            className="accent-accent h-4 w-4"
          />
          Keep the local copy in this browser too
        </label>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("merge")}
            className="bg-accent text-accent-foreground rounded-full py-2 text-sm font-semibold disabled:opacity-60"
          >
            Merge (recommended)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("import-local")}
            className="border-border-strong rounded-full border py-2 text-sm font-medium disabled:opacity-60"
          >
            Use this browser&apos;s papers only
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("keep-cloud")}
            className="border-border-strong rounded-full border py-2 text-sm font-medium disabled:opacity-60"
          >
            Keep my account&apos;s papers only
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose("cancel")}
            className="text-muted-foreground py-1 text-xs underline"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}
