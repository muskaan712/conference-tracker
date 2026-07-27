import type { ConferenceDate, ConferenceEdition, PaperType, ResearchArea, Tier } from "./schema";
import { tierRank } from "./tiers";
import { isEuropeanCountryCode } from "./geo";
import { resolveDateInstant } from "./datetime";

export type GeographicPreference = "europe-only" | "outside-europe" | "none";

export interface PlannerInput {
  expectedNotificationDate: string;
  researchAreas: ResearchArea[];
  minTier: Tier;
  maxTier: Tier;
  geographicPreference: GeographicPreference;
  minBufferDays: number;
  paperType?: PaperType;
  requiredTrack?: string;
  excludeSlug?: string;
}

export const PLANNER_ASSESSMENTS = [
  "Comfortable",
  "Feasible",
  "Tight",
  "Very tight",
  "Unrealistic",
] as const;
export type PlannerAssessment = (typeof PLANNER_ASSESSMENTS)[number];

/** Days-available thresholds for each assessment band. Values are inclusive lower bounds. */
export const ASSESSMENT_THRESHOLDS: Record<Exclude<PlannerAssessment, "Unrealistic">, number> = {
  Comfortable: 60,
  Feasible: 30,
  Tight: 14,
  "Very tight": 0,
};

export function assessPlanningWindow(daysAvailable: number): PlannerAssessment {
  if (daysAvailable < ASSESSMENT_THRESHOLDS["Very tight"]) return "Unrealistic";
  if (daysAvailable < ASSESSMENT_THRESHOLDS.Tight) return "Very tight";
  if (daysAvailable < ASSESSMENT_THRESHOLDS.Feasible) return "Tight";
  if (daysAvailable < ASSESSMENT_THRESHOLDS.Comfortable) return "Feasible";
  return "Comfortable";
}

export interface PlannerCompatibility {
  topic: boolean;
  format: boolean;
  tier: boolean;
  geography: boolean;
}

export interface PlannerResult {
  edition: ConferenceEdition;
  targetDate: ConferenceDate;
  abstractDate?: ConferenceDate;
  daysAvailable: number;
  abstractRequired: boolean;
  compatibility: PlannerCompatibility;
  assessment: PlannerAssessment;
}

function matchesGeography(edition: ConferenceEdition, pref: GeographicPreference): boolean {
  if (pref === "none") return true;
  if (pref === "europe-only") return isEuropeanCountryCode(edition.countryCode);
  return !isEuropeanCountryCode(edition.countryCode);
}

/**
 * Finds editions whose submission deadline falls after `notification + buffer`,
 * scored for topical/format/tier/geography compatibility with the supplied paper.
 * This is a planning aid only — it says nothing about acceptance likelihood.
 */
export function planResubmissions(
  editions: ConferenceEdition[],
  input: PlannerInput,
): PlannerResult[] {
  const notificationInstant = new Date(input.expectedNotificationDate);
  const earliestUsable = new Date(notificationInstant.getTime() + input.minBufferDays * 86_400_000);
  const minRank = Math.min(tierRank(input.minTier), tierRank(input.maxTier));
  const maxRank = Math.max(tierRank(input.minTier), tierRank(input.maxTier));

  const results: PlannerResult[] = [];

  for (const edition of editions) {
    if (input.excludeSlug && edition.slug === input.excludeSlug) continue;
    if (input.requiredTrack && !edition.tracks.includes(input.requiredTrack)) continue;

    const active = edition.dates.filter((d) => d.verificationStatus !== "previous-cycle");
    const abstractDate = active
      .filter((d) => d.type === "abstract")
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];
    const fullPaperDate = active
      .filter((d) => d.type === "full-paper" || d.type === "arr-submission")
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];

    const targetDate = [fullPaperDate, abstractDate]
      .filter((d): d is ConferenceDate => Boolean(d))
      .filter((d) => resolveDateInstant(d) >= earliestUsable)
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];

    if (!targetDate) continue;

    const daysAvailable = Math.floor(
      (resolveDateInstant(targetDate).getTime() - earliestUsable.getTime()) / 86_400_000,
    );

    const tierOk =
      tierRank(edition.ranking.tier) >= minRank && tierRank(edition.ranking.tier) <= maxRank;
    const topicOk =
      input.researchAreas.length === 0 ||
      input.researchAreas.some((a) => edition.researchAreas.includes(a));
    const formatOk = !input.paperType || edition.paperTypes.includes(input.paperType);
    const geographyOk = matchesGeography(edition, input.geographicPreference);

    results.push({
      edition,
      targetDate,
      abstractDate: abstractDate && abstractDate.id !== targetDate.id ? abstractDate : undefined,
      daysAvailable,
      abstractRequired: Boolean(abstractDate),
      compatibility: { topic: topicOk, format: formatOk, tier: tierOk, geography: geographyOk },
      assessment: assessPlanningWindow(daysAvailable),
    });
  }

  return results.sort((a, b) => a.daysAvailable - b.daysAvailable);
}
