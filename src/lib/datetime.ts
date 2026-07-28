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
 * The authored `startsAt` wall-clock date/time, formatted without ever
 * resolving it to a UTC instant first. For an AoE date, `startsAt` *is*
 * already the intended AoE wall-clock value (e.g. "2026-07-28T23:59:00"
 * means "28 July 2026, 23:59 AoE") — reprojecting it through
 * `resolveDateInstant` and reading the UTC calendar date/time back off the
 * result is wrong for any AoE time past 12:00 (AoE is UTC-12, so +12h
 * crosses into the next UTC day), which would silently display the
 * deadline a day later than authored. Deliberately appends a fixed "Z"
 * rather than using `parseISO`/`new Date(...)` on the raw string, which
 * interpret a naive "no offset" datetime string in the *host machine's*
 * local timezone and could shift the displayed date depending on where the
 * code happens to run.
 */
function formatAuthoredWallClock(startsAt: string, pattern: string): string {
  return formatInTimeZone(`${startsAt}Z`, "UTC", pattern);
}

/**
 * Original deadline time as authored, in its own timezone (or AoE label).
 */
export function formatOriginal(
  date: Pick<ConferenceDate, "startsAt" | "timezone" | "isAoE">,
): string {
  if (date.isAoE) {
    return `${formatAuthoredWallClock(date.startsAt, "d MMMM yyyy, HH:mm")} (Anywhere on Earth, UTC−12)`;
  }
  const instant = resolveDateInstant(date);
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
  /** UTC calendar-day difference — used only for *bucketing* (today/tomorrow/approaching), never for pass/fail. */
  daysRemaining: number;
  /** Exact difference in milliseconds; negative once the instant is in the past. */
  msRemaining: number;
  /** Exact difference in hours (fractional); negative once the instant is in the past. */
  hoursRemaining: number;
  /** Whether the exact instant has passed `now` — the only correct test for "is this deadline still upcoming". */
  isPassed: boolean;
  label: RelativeLabel;
}

/**
 * Whole-day difference between two instants, counted in UTC calendar days.
 * Deliberately NOT date-fns's `differenceInCalendarDays`, which uses the host
 * machine's local timezone — that would make day-counting depend on where the
 * code happens to run (a Vercel server vs. a laptop vs. CI), which is exactly
 * the kind of nondeterminism a deadline tracker cannot afford.
 *
 * This is a *display* bucketing helper only (e.g. "approaching" vs.
 * "upcoming"). It must never be used to decide whether a deadline has
 * passed — a deadline at 00:30 UTC today has already passed at 23:00 UTC
 * today even though both instants fall on the same UTC calendar day. Use
 * `relativeTimeTo(...).isPassed` (backed by an exact instant comparison) for
 * that instead.
 */
function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
}

export function daysBetween(a: Date, b: Date): number {
  return utcDayNumber(b) - utcDayNumber(a);
}

/**
 * Whether `instant` has passed is decided by the exact millisecond
 * difference against `now` — never by UTC-calendar-day difference, which
 * would keep a deadline that passed a few hours ago mislabelled as "today"
 * (still upcoming) until the UTC calendar date itself rolls over.
 */
export function relativeTimeTo(instant: Date, now: Date = new Date()): RelativeTime {
  const msRemaining = instant.getTime() - now.getTime();
  const hoursRemaining = msRemaining / 3_600_000;
  const isPassed = msRemaining < 0;
  const daysRemaining = daysBetween(now, instant);
  let label: RelativeLabel;
  if (isPassed) label = "passed";
  else if (daysRemaining === 0) label = "today";
  else if (daysRemaining === 1) label = "tomorrow";
  else if (daysRemaining <= 14) label = "approaching";
  else label = "upcoming";
  return { daysRemaining, msRemaining, hoursRemaining, isPassed, label };
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
  const { isPassed, hoursRemaining } = relativeTimeTo(instant, now);
  const when = date.isAoE
    ? `${formatAuthoredWallClock(date.startsAt, "d MMMM yyyy")}, Anywhere on Earth`
    : formatInZone(instant, date.timezone || "UTC", "d MMMM yyyy");
  // Below 48 hours an exact hour/minute count is far less misleading than a
  // whole-day figure — see relativeTimeTo's isPassed doc comment for why
  // "passed" must key off the exact instant rather than the calendar day.
  let remaining: string;
  if (isPassed) {
    remaining = "deadline has passed";
  } else if (hoursRemaining < 1) {
    const minutes = Math.max(0, Math.round(hoursRemaining * 60));
    remaining = `${minutes} minute${minutes === 1 ? "" : "s"} remaining`;
  } else if (hoursRemaining < 48) {
    const hours = Math.floor(hoursRemaining);
    remaining = `${hours} hour${hours === 1 ? "" : "s"} remaining`;
  } else {
    const days = Math.floor(hoursRemaining / 24);
    remaining = `${days} day${days === 1 ? "" : "s"} remaining`;
  }
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
