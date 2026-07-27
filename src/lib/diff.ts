import type { ConferenceEdition } from "./schema";

export interface FieldChange {
  field: string;
  previousValue: string | null;
  newValue: string | null;
}

const SCALAR_FIELDS: Array<keyof ConferenceEdition> = [
  "name",
  "description",
  "venueName",
  "city",
  "country",
  "countryCode",
  "continent",
  "geographicCategory",
  "isOnline",
  "isHybrid",
  "locationVerificationStatus",
  "submissionSystem",
  "officialWebsiteUrl",
  "cfpUrl",
  "scheduleUrl",
  "notes",
];

function stringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Field-level diff between the currently-stored edition and a freshly
 * discovered/candidate edition. Pure and side-effect-free so it can drive
 * both the automated update report and its unit tests.
 */
export function diffEditionFields(
  previous: ConferenceEdition | undefined,
  candidate: ConferenceEdition,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of SCALAR_FIELDS) {
    const prevValue = previous ? stringify(previous[field]) : null;
    const nextValue = stringify(candidate[field]);
    if (prevValue !== nextValue) {
      changes.push({ field: String(field), previousValue: prevValue, newValue: nextValue });
    }
  }

  if (previous?.ranking.tier !== candidate.ranking.tier) {
    changes.push({
      field: "ranking.tier",
      previousValue: previous?.ranking.tier ?? null,
      newValue: candidate.ranking.tier,
    });
  }

  const prevDatesById = new Map((previous?.dates ?? []).map((d) => [d.id, d]));
  const candidateDatesById = new Map(candidate.dates.map((d) => [d.id, d]));

  for (const [id, date] of candidateDatesById) {
    const prevDate = prevDatesById.get(id);
    if (!prevDate) {
      changes.push({
        field: `dates.${id}`,
        previousValue: null,
        newValue: `${date.type}: ${date.startsAt}`,
      });
      continue;
    }
    if (prevDate.startsAt !== date.startsAt || prevDate.endsAt !== date.endsAt) {
      changes.push({
        field: `dates.${id}.startsAt`,
        previousValue: prevDate.startsAt,
        newValue: date.startsAt,
      });
    }
    if (prevDate.verificationStatus !== date.verificationStatus) {
      changes.push({
        field: `dates.${id}.verificationStatus`,
        previousValue: prevDate.verificationStatus,
        newValue: date.verificationStatus,
      });
    }
  }

  for (const [id, date] of prevDatesById) {
    if (!candidateDatesById.has(id)) {
      changes.push({
        field: `dates.${id}`,
        previousValue: `${date.type}: ${date.startsAt}`,
        newValue: null,
      });
    }
  }

  return changes;
}

export function hasChanges(
  previous: ConferenceEdition | undefined,
  candidate: ConferenceEdition,
): boolean {
  return diffEditionFields(previous, candidate).length > 0;
}
