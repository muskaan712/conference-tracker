import { formatInDefaultZone, formatOriginal, DEFAULT_DISPLAY_TIMEZONE } from "@/lib/datetime";
import type { ConferenceDate } from "@/lib/schema";
import { Clock3 } from "lucide-react";

export function TimezoneDisplay({
  date,
}: {
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE">;
}) {
  const original = formatOriginal(date);
  const berlin = formatInDefaultZone(date);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Original</dt>
      <dd>{original}</dd>
      {!date.isAoE && (
        <>
          <dt className="text-muted-foreground flex items-center gap-1">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            {DEFAULT_DISPLAY_TIMEZONE.replace("_", " ")}
          </dt>
          <dd>{berlin}</dd>
        </>
      )}
      {date.isAoE && (
        <>
          <dt className="text-muted-foreground flex items-center gap-1">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            Note
          </dt>
          <dd className="text-muted-foreground">
            &ldquo;Anywhere on Earth&rdquo; means the deadline is not truly over until this date has
            passed in every timezone (UTC−12). It is shown here in its original AoE meaning, never
            silently converted.
          </dd>
        </>
      )}
    </dl>
  );
}
