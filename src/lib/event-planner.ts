import type {
  CoLocatedEvent,
  CoLocatedEventType,
  ConferenceDate,
  ConferenceEdition,
  ResearchArea,
  Tier,
} from "./schema";
import { resolveDateInstant } from "./datetime";
import { isEuropeanCountryCode } from "./geo";
import { resolveEventLocation } from "./event-location";
import { parentTierFor } from "./event-filtering";
import { assessPlanningWindow, type GeographicPreference, type PlannerAssessment } from "./planner";

const EVENT_ABSTRACT_TYPES = [
  "workshop-abstract",
  "shared-task-registration",
  "competition-registration",
];
const EVENT_SUBMISSION_TYPES = [
  "workshop-paper",
  "shared-task-submission",
  "competition-submission",
  "challenge-deadline",
  "doctoral-consortium-deadline",
];

export interface EventPlannerInput {
  expectedNotificationDate: string;
  researchAreas: ResearchArea[];
  geographicPreference: GeographicPreference;
  minBufferDays: number;
  eventTypes?: CoLocatedEventType[];
  archivalOnly?: boolean;
  parentTiers?: Tier[];
  eventTiers?: Tier[];
}

export interface EventPlannerCompatibility {
  topic: boolean;
  geography: boolean;
}

export interface EventPlannerResult {
  event: CoLocatedEvent;
  parentEditionAcronym?: string;
  parentEditionYear?: number;
  parentTier?: Tier;
  targetDate: ConferenceDate;
  abstractDate?: ConferenceDate;
  daysAvailable: number;
  abstractRequired: boolean;
  compatibility: EventPlannerCompatibility;
  assessment: PlannerAssessment;
}

function matchesGeography(
  event: CoLocatedEvent,
  pref: GeographicPreference,
  parentEdition: ConferenceEdition | undefined,
): boolean {
  if (pref === "none") return true;
  const location = resolveEventLocation(event, parentEdition);
  const isEurope = location.continent === "Europe" || isEuropeanCountryCode(location.countryCode);
  return pref === "europe-only" ? isEurope : !isEurope;
}

/**
 * Event-specific counterpart to planResubmissions — never treats an
 * Unclassified event as equivalent to a ranked main conference; tier
 * filtering here is always against the event's *own* independent tier or
 * (separately) its parent's tier, never a blended value. `editions` must be
 * supplied by the caller (already fs-free, e.g. from a page's
 * getAllEditions() call) rather than fetched internally, so this stays safe
 * to import from Client Components like resubmission-planner.tsx.
 */
export function planEventResubmissions(
  events: CoLocatedEvent[],
  input: EventPlannerInput,
  editions: ConferenceEdition[] = [],
): EventPlannerResult[] {
  const notificationInstant = new Date(input.expectedNotificationDate);
  const earliestUsable = new Date(notificationInstant.getTime() + input.minBufferDays * 86_400_000);

  const results: EventPlannerResult[] = [];

  for (const event of events) {
    if (input.eventTypes?.length && !input.eventTypes.includes(event.type)) continue;
    if (input.archivalOnly && event.proceedings?.status !== "archival") continue;
    if (input.eventTiers?.length && !input.eventTiers.includes(event.ranking.tier)) continue;
    if (input.parentTiers?.length) {
      const pt = parentTierFor(event, editions);
      if (!pt || !input.parentTiers.includes(pt)) continue;
    }

    const active = event.dates.filter((d) => d.verificationStatus !== "previous-cycle");
    const abstractDate = active
      .filter((d) => EVENT_ABSTRACT_TYPES.includes(d.type))
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];
    const submissionDate = active
      .filter((d) => EVENT_SUBMISSION_TYPES.includes(d.type))
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];

    const targetDate = [submissionDate, abstractDate]
      .filter((d): d is ConferenceDate => Boolean(d))
      .filter((d) => resolveDateInstant(d) >= earliestUsable)
      .sort((a, b) => resolveDateInstant(a).getTime() - resolveDateInstant(b).getTime())[0];

    if (!targetDate) continue;

    const daysAvailable = Math.floor(
      (resolveDateInstant(targetDate).getTime() - earliestUsable.getTime()) / 86_400_000,
    );

    const parent = editions.find((e) => e.slug === event.parentConferenceEditionSlug);

    const topicOk =
      input.researchAreas.length === 0 ||
      input.researchAreas.some((a) => event.researchAreas.includes(a));
    const geographyOk = matchesGeography(event, input.geographicPreference, parent);

    results.push({
      event,
      parentEditionAcronym: parent?.acronym,
      parentEditionYear: parent?.editionYear,
      parentTier: parent?.ranking.tier,
      targetDate,
      abstractDate: abstractDate && abstractDate.id !== targetDate.id ? abstractDate : undefined,
      daysAvailable,
      abstractRequired: Boolean(abstractDate),
      compatibility: { topic: topicOk, geography: geographyOk },
      assessment: assessPlanningWindow(daysAvailable),
    });
  }

  return results.sort((a, b) => a.daysAvailable - b.daysAvailable);
}
