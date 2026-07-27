import { TIERS, type Tier } from "./schema";

export function tierRank(tier: Tier): number {
  const index = TIERS.indexOf(tier);
  return index === -1 ? TIERS.length : index;
}

export function compareTiers(a: Tier, b: Tier): number {
  return tierRank(a) - tierRank(b);
}

export function sortByTier<T>(items: T[], getTier: (item: T) => Tier): T[] {
  return [...items].sort((a, b) => compareTiers(getTier(a), getTier(b)));
}

export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; dot: string }> =
  {
    "A*": {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-900 dark:text-amber-200",
      border: "border-amber-300 dark:border-amber-800",
      dot: "bg-amber-500",
    },
    A: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-900 dark:text-emerald-200",
      border: "border-emerald-300 dark:border-emerald-800",
      dot: "bg-emerald-500",
    },
    B: {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      text: "text-sky-900 dark:text-sky-200",
      border: "border-sky-300 dark:border-sky-800",
      dot: "bg-sky-500",
    },
    C: {
      bg: "bg-violet-50 dark:bg-violet-950/40",
      text: "text-violet-900 dark:text-violet-200",
      border: "border-violet-300 dark:border-violet-800",
      dot: "bg-violet-500",
    },
    Unclassified: {
      bg: "bg-stone-100 dark:bg-stone-900",
      text: "text-stone-700 dark:text-stone-300",
      border: "border-stone-300 dark:border-stone-700",
      dot: "bg-stone-400",
    },
  };
