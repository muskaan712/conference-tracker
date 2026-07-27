import { formatInTimeZone } from "date-fns-tz";
import type { CoLocatedEvent, ConferenceDate, ConferenceEdition } from "./schema";
import { resolveDateInstant } from "./datetime";

/** Escapes text per RFC 5545 (backslash, semicolon, comma, then newlines). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a single ICS content line to <=75 octets per RFC 5545 §3.1. */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const limit = first ? 75 : 74;
    let chunk = rest.slice(0, limit);
    // avoid splitting a multi-byte UTF-16 surrogate pair
    while (new TextEncoder().encode(chunk).length > limit) {
      chunk = chunk.slice(0, -1);
    }
    chunks.push(chunk);
    rest = rest.slice(chunk.length);
    first = false;
  }
  return chunks.join("\r\n ");
}

export function formatIcsDateUtc(instant: Date): string {
  return formatInTimeZone(instant, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

export function icsUid(seed: string): string {
  return `${seed}@ai-conference-tracker`;
}

export interface IcsEventInput {
  uidSeed: string;
  summary: string;
  description: string;
  start: Date;
  end?: Date;
  url?: string;
  now?: Date;
}

export function buildIcsEvent(input: IcsEventInput): string {
  const now = input.now ?? new Date();
  const end = input.end ?? new Date(input.start.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${icsUid(input.uidSeed)}`,
    `DTSTAMP:${formatIcsDateUtc(now)}`,
    `DTSTART:${formatIcsDateUtc(input.start)}`,
    `DTEND:${formatIcsDateUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
  ];
  if (input.url) lines.push(`URL:${escapeIcsText(input.url)}`);
  lines.push("END:VEVENT");
  return lines.map(foldIcsLine).join("\r\n");
}

export function buildIcsCalendar(events: string[], calendarName: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Conference Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function timezoneNote(date: ConferenceDate): string {
  if (date.isAoE) return "Original timezone: Anywhere on Earth (AoE, UTC-12).";
  return `Original timezone: ${date.timezone}.`;
}

function verificationWarning(date: ConferenceDate): string | undefined {
  if (date.verificationStatus === "official" || date.verificationStatus === "verified")
    return undefined;
  return `Warning: this date is "${date.verificationStatus}" and has not been fully verified against an official source. Confirm before relying on it.`;
}

export function descriptionForDate(edition: ConferenceEdition, date: ConferenceDate): string {
  const parts = [
    `Conference: ${edition.name} (${edition.acronym} ${edition.editionYear})`,
    `Deadline type: ${date.label}`,
  ];
  if (edition.officialWebsiteUrl) parts.push(`Official website: ${edition.officialWebsiteUrl}`);
  if (date.sourceUrl) parts.push(`Source: ${date.sourceUrl}`);
  parts.push(timezoneNote(date));
  const warning = verificationWarning(date);
  if (warning) parts.push(warning);
  return parts.join("\n");
}

/** Single deadline -> one-event .ics calendar. */
export function icsForDeadline(
  edition: ConferenceEdition,
  date: ConferenceDate,
  now?: Date,
): string {
  const instant = resolveDateInstant(date);
  const end = date.endsAt ? resolveDateInstant({ ...date, startsAt: date.endsAt }) : undefined;
  const event = buildIcsEvent({
    uidSeed: `${edition.slug}-${date.id}`,
    summary: `${edition.acronym} ${edition.editionYear}: ${date.label}`,
    description: descriptionForDate(edition, date),
    start: instant,
    end,
    url: edition.officialWebsiteUrl,
    now,
  });
  return buildIcsCalendar([event], `${edition.acronym} ${edition.editionYear} - ${date.label}`);
}

/** All dates for a single conference edition -> multi-event .ics calendar. */
export function icsForConference(edition: ConferenceEdition, now?: Date): string {
  const events = edition.dates.map((date) => {
    const instant = resolveDateInstant(date);
    const end = date.endsAt ? resolveDateInstant({ ...date, startsAt: date.endsAt }) : undefined;
    return buildIcsEvent({
      uidSeed: `${edition.slug}-${date.id}`,
      summary: `${edition.acronym} ${edition.editionYear}: ${date.label}`,
      description: descriptionForDate(edition, date),
      start: instant,
      end,
      url: edition.officialWebsiteUrl,
      now,
    });
  });
  return buildIcsCalendar(events, `${edition.acronym} ${edition.editionYear}`);
}

/** An arbitrary filtered set of (edition, date) pairs -> combined .ics calendar. */
export function icsForDeadlineSet(
  items: Array<{ edition: ConferenceEdition; date: ConferenceDate }>,
  calendarName: string,
  now?: Date,
): string {
  const events = items.map(({ edition, date }) => {
    const instant = resolveDateInstant(date);
    const end = date.endsAt ? resolveDateInstant({ ...date, startsAt: date.endsAt }) : undefined;
    return buildIcsEvent({
      uidSeed: `${edition.slug}-${date.id}`,
      summary: `${edition.acronym} ${edition.editionYear}: ${date.label}`,
      description: descriptionForDate(edition, date),
      start: instant,
      end,
      url: edition.officialWebsiteUrl,
      now,
    });
  });
  return buildIcsCalendar(events, calendarName);
}

function eventTimezoneNote(date: ConferenceDate): string {
  if (date.isAoE) return "Original timezone: Anywhere on Earth (AoE, UTC-12).";
  return `Original timezone: ${date.timezone}.`;
}

/** Mirrors descriptionForDate but for an associated event rather than a main conference edition. */
export function descriptionForEventDate(event: CoLocatedEvent, date: ConferenceDate): string {
  const parts = [
    `Event: ${event.name}${event.acronym ? ` (${event.acronym})` : ""}`,
    `Deadline type: ${date.label}`,
  ];
  if (event.officialWebsiteUrl) parts.push(`Official website: ${event.officialWebsiteUrl}`);
  if (date.sourceUrl) parts.push(`Source: ${date.sourceUrl}`);
  parts.push(eventTimezoneNote(date));
  const warning = verificationWarning(date);
  if (warning) parts.push(warning);
  return parts.join("\n");
}

/** Single associated-event deadline -> one-event .ics calendar. */
export function icsForEventDate(event: CoLocatedEvent, date: ConferenceDate, now?: Date): string {
  const instant = resolveDateInstant(date);
  const end = date.endsAt ? resolveDateInstant({ ...date, startsAt: date.endsAt }) : undefined;
  const icsEvent = buildIcsEvent({
    uidSeed: `${event.slug}-${date.id}`,
    summary: `${event.acronym ?? event.name}: ${date.label}`,
    description: descriptionForEventDate(event, date),
    start: instant,
    end,
    url: event.officialWebsiteUrl,
    now,
  });
  return buildIcsCalendar([icsEvent], `${event.acronym ?? event.name} - ${date.label}`);
}

/** All dates for a single associated event -> multi-event .ics calendar. */
export function icsForEvent(event: CoLocatedEvent, now?: Date): string {
  const events = event.dates.map((date) => {
    const instant = resolveDateInstant(date);
    const end = date.endsAt ? resolveDateInstant({ ...date, startsAt: date.endsAt }) : undefined;
    return buildIcsEvent({
      uidSeed: `${event.slug}-${date.id}`,
      summary: `${event.acronym ?? event.name}: ${date.label}`,
      description: descriptionForEventDate(event, date),
      start: instant,
      end,
      url: event.officialWebsiteUrl,
      now,
    });
  });
  return buildIcsCalendar(events, event.acronym ?? event.name);
}

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
