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

/**
 * Coordinated blue / pink / yellow tier treatment (A* strongest blue, A medium
 * blue, B pink, C yellow, Unclassified cool grey) — see the visual-refresh
 * "Tier colours" spec. The tier letter itself is always retained; colour is
 * never the only signal.
 */
export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; dot: string }> =
  {
    "A*": {
      bg: "bg-blue-100 dark:bg-blue-950/60",
      text: "text-blue-950 dark:text-blue-100",
      border: "border-blue-400 dark:border-blue-700",
      dot: "bg-blue-700 dark:bg-blue-400",
    },
    A: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-900 dark:text-blue-200",
      border: "border-blue-300 dark:border-blue-800",
      dot: "bg-blue-500",
    },
    B: {
      bg: "bg-pink-50 dark:bg-pink-950/40",
      text: "text-pink-900 dark:text-pink-200",
      border: "border-pink-300 dark:border-pink-800",
      dot: "bg-pink-500",
    },
    C: {
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      text: "text-yellow-900 dark:text-yellow-200",
      border: "border-yellow-300 dark:border-yellow-800",
      dot: "bg-yellow-500",
    },
    Unclassified: {
      bg: "bg-slate-100 dark:bg-slate-800/60",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-300 dark:border-slate-700",
      dot: "bg-slate-400",
    },
  };
