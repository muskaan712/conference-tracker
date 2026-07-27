import type { CoLocatedEvent } from "./schema";
import type { FieldChange } from "./diff";

const SCALAR_FIELDS: Array<keyof CoLocatedEvent> = [
  "name",
  "description",
  "lifecycleStatus",
  "officialWebsiteUrl",
  "callForPapersUrl",
  "submissionSystemUrl",
  "programmeUrl",
  "pageLimit",
  "submissionFormat",
  "reviewModel",
  "submissionLanguage",
  "notes",
];

function stringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Field-level diff for an associated event — mirrors diffEditionFields in diff.ts. */
export function diffEventFields(
  previous: CoLocatedEvent | undefined,
  candidate: CoLocatedEvent,
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

  if (previous?.proceedings?.status !== candidate.proceedings?.status) {
    changes.push({
      field: "proceedings.status",
      previousValue: previous?.proceedings?.status ?? null,
      newValue: candidate.proceedings?.status ?? null,
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
    if (prevDate.startsAt !== date.startsAt) {
      changes.push({
        field: `dates.${id}.startsAt`,
        previousValue: prevDate.startsAt,
        newValue: date.startsAt,
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
