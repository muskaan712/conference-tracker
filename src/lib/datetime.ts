import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { ConferenceDate } from "./schema";

export const DEFAULT_DISPLAY_TIMEZONE = "Europe/Berlin";

/**
 * IANA zone used to represent "Anywhere on Earth" (UTC-12), the convention
 * academic deadlines use: the deadline has not truly passed until it is past
 * that calendar date in the last timezone on the planet.
 */
export const AOE_TIMEZONE = "Etc/GMT+12";

/**
 * Resolves a ConferenceDate's `startsAt` wall-clock value to the true UTC instant
 * at which it occurs, honoring `isAoE` (forces AoE zone) or the stored `timezone`.
 */
export function resolveDateInstant(
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE">,
): Date {
  const zone = date.isAoE ? AOE_TIMEZONE : date.timezone || "UTC";
  return fromZonedTime(date.startsAt, zone);
}

export function formatInZone(
  instant: Date,
  zone: string,
  pattern = "d MMMM yyyy, HH:mm zzz",
): string {
  return formatInTimeZone(instant, zone, pattern);
}

/**
 * Original deadline time as authored, in its own timezone (or AoE label).
 * Deliberately routes through `resolveDateInstant` (which uses `fromZonedTime`)
 * rather than `parseISO`/`new Date(...)` on the raw string — those interpret a
 * naive "no offset" datetime string in the *host machine's* local timezone,
 * which would silently shift the displayed AoE calendar date depending on
 * where the code happens to run.
 */
export function formatOriginal(
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE">,
): string {
  const instant = resolveDateInstant(date);
  if (date.isAoE) {
    return `${formatInTimeZone(instant, "UTC", "d MMMM yyyy")} (Anywhere on Earth, UTC−12)`;
  }
  return formatInZone(instant, date.timezone || "UTC");
}

/** The same instant expressed in the site's default display timezone. */
export function formatInDefaultZone(
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE">,
): string {
  const instant = resolveDateInstant(date);
  return formatInZone(instant, DEFAULT_DISPLAY_TIMEZONE);
}

export type RelativeLabel = "today" | "tomorrow" | "approaching" | "upcoming" | "passed";

export interface RelativeTime {
  daysRemaining: number;
  label: RelativeLabel;
}

/**
 * Whole-day difference between two instants, counted in UTC calendar days.
 * Deliberately NOT date-fns's `differenceInCalendarDays`, which uses the host
 * machine's local timezone — that would make day-counting depend on where the
 * code happens to run (a Vercel server vs. a laptop vs. CI), which is exactly
 * the kind of nondeterminism a deadline tracker cannot afford.
 */
function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
}

export function daysBetween(a: Date, b: Date): number {
  return utcDayNumber(b) - utcDayNumber(a);
}

/** Days remaining is computed by UTC calendar-day difference. */
export function relativeTimeTo(instant: Date, now: Date = new Date()): RelativeTime {
  const daysRemaining = daysBetween(now, instant);
  let label: RelativeLabel;
  if (daysRemaining < 0) label = "passed";
  else if (daysRemaining === 0) label = "today";
  else if (daysRemaining === 1) label = "tomorrow";
  else if (daysRemaining <= 14) label = "approaching";
  else label = "upcoming";
  return { daysRemaining, label };
}

/**
 * Screen-reader-friendly phrasing for a deadline, e.g.:
 * "Full paper deadline, 28 July 2026, Anywhere on Earth, 5 days remaining, verified from official source."
 */
export function accessibleDeadlinePhrase(
  label: string,
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE" | "verificationStatus">,
  now: Date = new Date(),
): string {
  const instant = resolveDateInstant(date);
  const { daysRemaining, label: rel } = relativeTimeTo(instant, now);
  const when = date.isAoE
    ? `${formatInTimeZone(instant, "UTC", "d MMMM yyyy")}, Anywhere on Earth`
    : formatInZone(instant, date.timezone || "UTC", "d MMMM yyyy");
  const remaining =
    rel === "passed"
      ? "deadline has passed"
      : rel === "today"
        ? "due today"
        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;
  const verificationPhrase = verificationPhraseFor(date.verificationStatus);
  return `${label}, ${when}, ${remaining}, ${verificationPhrase}.`;
}

export function verificationPhraseFor(status: ConferenceDate["verificationStatus"]): string {
  switch (status) {
    case "official":
      return "confirmed from the official source";
    case "verified":
      return "verified against an official source";
    case "tentative":
      return "tentative, not yet confirmed";
    case "previous-cycle":
      return "from a previous edition, shown for reference only";
    case "discovered":
      return "automatically discovered, pending human review";
    case "conflicting":
      return "conflicting information found across sources";
    case "unverified":
      return "unverified, please check the official website";
  }
}
