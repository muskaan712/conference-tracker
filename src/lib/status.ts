import type { ConferenceDate, DeadlineType } from "./schema";
import { daysBetween, resolveDateInstant } from "./datetime";

export const CONFERENCE_STATUSES = [
  "Open",
  "Opening Soon",
  "Abstract Deadline Approaching",
  "Paper Deadline Approaching",
  "In Review",
  "Author Response",
  "Notification Soon",
  "Closed",
  "Camera Ready",
  "Conference Upcoming",
  "Conference Ongoing",
  "Completed",
  "Dates Not Announced",
  "Tentative Dates",
  "Reference Cycle Only",
] as const;
export type ConferenceStatus = (typeof CONFERENCE_STATUSES)[number];

/** Days out at which an upcoming deadline is considered "approaching". */
export const APPROACHING_WINDOW_DAYS = 14;
/** Beyond this many days out, a not-yet-open cycle reads as "Opening Soon" rather than "Open". */
export const OPENING_SOON_THRESHOLD_DAYS = 60;
/** Days out at which an upcoming notification is flagged "Notification Soon". */
export const NOTIFICATION_SOON_WINDOW_DAYS = 7;
/** Fallback author-response window length when a date has no explicit `endsAt`. */
export const AUTHOR_RESPONSE_FALLBACK_DAYS = 7;

function instant(date: ConferenceDate): Date {
  return resolveDateInstant(date);
}

function endInstant(date: ConferenceDate): Date {
  if (!date.endsAt) return instant(date);
  return resolveDateInstant({ ...date, startsAt: date.endsAt });
}

function pickEarliest(dates: ConferenceDate[], types: DeadlineType[]): ConferenceDate | undefined {
  const candidates = dates.filter((d) => types.includes(d.type));
  if (candidates.length === 0) return undefined;
  return candidates.reduce((min, d) => (instant(d) < instant(min) ? d : min));
}

function isWithinAuthorResponseWindow(date: ConferenceDate, now: Date): boolean {
  const start = instant(date);
  const end = date.endsAt
    ? endInstant(date)
    : new Date(start.getTime() + AUTHOR_RESPONSE_FALLBACK_DAYS * 86_400_000);
  return now >= start && now <= end;
}

function finalize(status: ConferenceStatus, keyDate: ConferenceDate | undefined): ConferenceStatus {
  if (!keyDate) return status;
  if (
    keyDate.verificationStatus === "tentative" &&
    status !== "Completed" &&
    status !== "Conference Ongoing"
  ) {
    return "Tentative Dates";
  }
  return status;
}

/**
 * Pure function deriving a single overarching status for a conference edition
 * from its dates and the current time. Never mutate or read from anywhere else;
 * this is the single source of truth for "what phase is this conference in".
 */
export function deriveConferenceStatus(
  dates: ConferenceDate[],
  now: Date = new Date(),
): ConferenceStatus {
  if (dates.length === 0) return "Dates Not Announced";

  const active = dates.filter((d) => d.verificationStatus !== "previous-cycle");
  if (active.length === 0) return "Reference Cycle Only";

  const abstract = pickEarliest(active, ["abstract"]);
  const fullPaper = pickEarliest(active, ["full-paper", "arr-submission"]);
  const authorResponse = pickEarliest(active, ["author-response", "rebuttal"]);
  const notification = pickEarliest(active, ["notification", "arr-commitment"]);
  const cameraReady = pickEarliest(active, ["camera-ready"]);
  const confStart = pickEarliest(active, ["conference-start"]);
  const confEnd = pickEarliest(active, ["conference-end"]) ?? confStart;

  // 1. The conference itself, if we're inside or past it, always wins.
  if (confStart) {
    const startDay = instant(confStart);
    const endDay = confEnd ? instant(confEnd) : startDay;
    const sinceStart = daysBetween(startDay, now);
    const untilEnd = daysBetween(now, endDay);
    if (untilEnd < 0) return finalize("Completed", confEnd ?? confStart);
    if (sinceStart >= 0 && untilEnd >= 0) return finalize("Conference Ongoing", confStart);
  }

  const submissionDeadline = fullPaper ?? abstract;

  // 2. Before the submission deadline: Open / Opening Soon / *** Approaching.
  if (fullPaper) {
    const fpInstant = instant(fullPaper);
    if (now < fpInstant) {
      const daysLeft = daysBetween(now, fpInstant);
      if (daysLeft <= APPROACHING_WINDOW_DAYS)
        return finalize("Paper Deadline Approaching", fullPaper);
      if (abstract && now < instant(abstract)) {
        const abstractDaysLeft = daysBetween(now, instant(abstract));
        if (abstractDaysLeft <= APPROACHING_WINDOW_DAYS)
          return finalize("Abstract Deadline Approaching", abstract);
      }
      if (daysLeft > OPENING_SOON_THRESHOLD_DAYS) return finalize("Opening Soon", fullPaper);
      return finalize("Open", fullPaper);
    }
  } else if (abstract) {
    const abInstant = instant(abstract);
    if (now < abInstant) {
      const daysLeft = daysBetween(now, abInstant);
      if (daysLeft <= APPROACHING_WINDOW_DAYS)
        return finalize("Abstract Deadline Approaching", abstract);
      if (daysLeft > OPENING_SOON_THRESHOLD_DAYS) return finalize("Opening Soon", abstract);
      return finalize("Open", abstract);
    }
  }

  // From here on, submission (if any) has closed. Walk the remaining pipeline
  // stages in strict chronological order — author response, then notification,
  // then camera-ready, then the pre-conference gap — so a conference with no
  // camera-ready date on file doesn't jump straight to "Conference Upcoming"
  // while it's still genuinely in review.
  // 3. Author response / rebuttal window, if we're inside it right now.
  if (authorResponse && isWithinAuthorResponseWindow(authorResponse, now)) {
    return finalize("Author Response", authorResponse);
  }

  // 4. Before notification: In Review, or Notification Soon within a week of it.
  if (notification) {
    const notifInstant = instant(notification);
    if (now < notifInstant) {
      const daysLeft = daysBetween(now, notifInstant);
      if (daysLeft <= NOTIFICATION_SOON_WINDOW_DAYS)
        return finalize("Notification Soon", notification);
      return finalize("In Review", notification);
    }
  }

  // 5. After notification (or no notification on file), before camera-ready.
  if (cameraReady) {
    const crInstant = instant(cameraReady);
    if (now < crInstant) return finalize("Camera Ready", cameraReady);
  }

  // 6. After camera-ready (or no camera-ready on file), before the conference starts.
  if (confStart && now < instant(confStart)) {
    return finalize("Conference Upcoming", confStart);
  }

  // 7. Submission closed and nothing later is on file yet.
  if (submissionDeadline) return finalize("Closed", submissionDeadline);

  return "Dates Not Announced";
}

export const STATUS_DESCRIPTIONS: Record<ConferenceStatus, string> = {
  Open: "Submissions are open for this cycle.",
  "Opening Soon": "This cycle's call is announced but the main deadline is still far out.",
  "Abstract Deadline Approaching": "The abstract registration deadline is within two weeks.",
  "Paper Deadline Approaching": "The full paper deadline is within two weeks.",
  "In Review": "Submissions have closed and papers are under review.",
  "Author Response": "The author response / rebuttal window is open.",
  "Notification Soon": "Acceptance notifications are expected within a week.",
  Closed: "Submissions for this cycle have closed.",
  "Camera Ready": "Authors of accepted papers are preparing camera-ready versions.",
  "Conference Upcoming": "The conference itself has not yet started.",
  "Conference Ongoing": "The conference is currently taking place.",
  Completed: "This edition has concluded.",
  "Dates Not Announced": "No dates have been published for this edition yet.",
  "Tentative Dates": "The next relevant date is tentative and not yet confirmed.",
  "Reference Cycle Only":
    "Only previous-cycle reference dates are available; nothing is confirmed for this edition.",
};
