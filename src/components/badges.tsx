import { cn } from "@/lib/cn";
import { TIER_COLORS } from "@/lib/tiers";
import { countryNameForCode, flagEmojiForCountryCode } from "@/lib/geo";
import { DEADLINE_TYPE_META, VERIFICATION_META, CONFERENCE_STATUS_META } from "@/lib/badge-meta";
import type { DeadlineType, GeographicCategory, Tier, VerificationStatus } from "@/lib/schema";
import type { ConferenceStatus } from "@/lib/status";
import { Globe2, MapPinOff, MonitorSmartphone } from "lucide-react";

function badgeBase(extra?: string) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap",
    extra,
  );
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const colors = TIER_COLORS[tier];
  return (
    <span className={badgeBase(cn(colors.bg, colors.text, colors.border, className))}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      Tier {tier}
    </span>
  );
}

const REGION_META: Record<GeographicCategory, { icon: typeof Globe2; classes: string }> = {
  Europe: {
    icon: MapPinOff,
    classes:
      "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  },
  "Outside Europe": {
    icon: MapPinOff,
    classes:
      "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  },
  Online: {
    icon: MonitorSmartphone,
    classes:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  Hybrid: {
    icon: MonitorSmartphone,
    classes:
      "bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
  },
  "Location not announced": {
    icon: MapPinOff,
    classes:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};

export function RegionBadge({
  category,
  className,
}: {
  category: GeographicCategory;
  className?: string;
}) {
  const meta = REGION_META[category];
  const Icon = meta.icon;
  return (
    <span className={badgeBase(cn(meta.classes, className))}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {category}
    </span>
  );
}

export function CountryFlag({
  countryCode,
  className,
}: {
  countryCode?: string;
  className?: string;
}) {
  if (!countryCode) return null;
  const name = countryNameForCode(countryCode);
  const emoji = flagEmojiForCountryCode(countryCode);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      {emoji ? (
        <span role="img" aria-label={name ? `Flag of ${name}` : `Flag of ${countryCode}`}>
          {emoji}
        </span>
      ) : null}
      <span className="text-muted-foreground">{name ?? countryCode}</span>
    </span>
  );
}

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const meta = VERIFICATION_META[status];
  const Icon = meta.icon;
  return (
    <span className={badgeBase(cn(meta.colorClasses, className))}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: ConferenceStatus;
  className?: string;
}) {
  const meta = CONFERENCE_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={badgeBase(cn(meta.colorClasses, className))}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function DeadlineTypeBadge({ type, className }: { type: DeadlineType; className?: string }) {
  const meta = DEADLINE_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span className={badgeBase(cn(meta.colorClasses, className))}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
