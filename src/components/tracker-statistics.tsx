import { formatInTimeZone } from "date-fns-tz";
import type { TrackerStats } from "@/lib/conferences";
import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/datetime";
import { CalendarCheck2, Globe2, HelpCircle, Layers, ScanLine } from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "Not yet recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not yet recorded";
  return formatInTimeZone(date, DEFAULT_DISPLAY_TIMEZONE, "d MMMM yyyy");
}

export function TrackerStatistics({ stats }: { stats: TrackerStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Layers} label="Conference series" value={stats.seriesCount} />
        <StatTile icon={Globe2} label="Editions tracked" value={stats.conferenceCount} />
        <StatTile
          icon={CalendarCheck2}
          label="Upcoming deadlines"
          value={stats.upcomingDeadlineCount}
        />
        <StatTile
          icon={ScanLine}
          label="Last automated scan"
          value={formatDate(stats.lastAutomatedScan)}
          small
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Tracker data last verified {formatDate(stats.lastTrackerUpdate)} (
        {DEFAULT_DISPLAY_TIMEZONE.replace("_", " ")}).
      </p>
      <details className="group border-border bg-surface rounded-lg border px-3 py-2 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
          <HelpCircle aria-hidden className="text-accent h-4 w-4" />
          What is AoE?
        </summary>
        <p className="text-muted-foreground mt-2">
          <strong>Anywhere on Earth (AoE)</strong> is the convention most AI/ML conferences use for
          paper deadlines: UTC−12, the last timezone on the planet. An AoE deadline has not truly
          passed until that calendar date has ended everywhere on Earth — so it can be up to 26
          hours later than the same clock time in your own timezone. This site always shows the
          original AoE date and never silently converts it to a local time.
        </p>
      </details>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <Icon aria-hidden className="text-accent mb-2 h-4 w-4" />
      <p
        className={
          small ? "font-serif text-base font-semibold" : "font-serif text-2xl font-semibold"
        }
      >
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
