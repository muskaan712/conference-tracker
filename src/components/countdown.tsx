import { accessibleDeadlinePhrase, relativeTimeTo, resolveDateInstant } from "@/lib/datetime";
import type { ConferenceDate } from "@/lib/schema";
import { cn } from "@/lib/cn";

const LABEL_TEXT: Record<string, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  approaching: "Approaching",
  upcoming: "Upcoming",
  passed: "Passed",
};

const LABEL_CLASSES: Record<string, string> = {
  today: "text-red-700 dark:text-red-300 font-semibold",
  tomorrow: "text-orange-700 dark:text-orange-300 font-semibold",
  approaching: "text-amber-700 dark:text-amber-300",
  upcoming: "text-muted-foreground",
  passed: "text-muted-foreground line-through decoration-1",
};

export function Countdown({
  date,
  label,
  now,
  className,
}: {
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE" | "verificationStatus">;
  label: string;
  now?: Date;
  className?: string;
}) {
  const instant = resolveDateInstant(date);
  const { daysRemaining, label: rel } = relativeTimeTo(instant, now);
  const daysText = rel === "passed" ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d left`;
  const text =
    rel === "today" || rel === "tomorrow" ? LABEL_TEXT[rel] : `${daysText} · ${LABEL_TEXT[rel]}`;
  return (
    <span className={cn("text-sm", LABEL_CLASSES[rel], className)}>
      <span className="sr-only">{accessibleDeadlinePhrase(label, date, now)}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}
