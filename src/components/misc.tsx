import { AlertTriangle, ExternalLink, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function SourceCitation({ url, label = "Source" }: { url?: string; label?: string }) {
  if (!url) {
    return <span className="text-muted-foreground text-xs">{label}: not yet available</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent inline-flex items-center gap-1 text-xs underline decoration-dotted underline-offset-2 hover:decoration-solid"
    >
      {label}
      <ExternalLink aria-hidden className="h-3 w-3" />
    </a>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border-strong bg-surface flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <Inbox aria-hidden className="text-muted-foreground h-8 w-8" />
      <p className="font-serif text-lg font-medium">{title}</p>
      {description ? <p className="text-muted-foreground max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-6 py-14 text-center dark:border-red-800 dark:bg-red-950/40"
    >
      <AlertTriangle aria-hidden className="h-8 w-8 text-red-700 dark:text-red-300" />
      <p className="font-serif text-lg font-medium text-red-900 dark:text-red-100">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-red-800 dark:text-red-200">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function DataDisclaimer({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        Conference dates and deadlines can change.{" "}
        {compact
          ? "Always confirm on the official conference website."
          : "Always confirm critical information on the linked official conference website before submitting a paper or making travel arrangements."}
      </p>
    </div>
  );
}
