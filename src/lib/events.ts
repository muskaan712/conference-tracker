import fs from "node:fs";
import path from "node:path";
import { coLocatedEventFileSchema, type CoLocatedEvent } from "./schema";
import { getEditionBySlug } from "./conferences";
import {
  resolveEventLocation as resolveEventLocationPure,
  type ResolvedEventLocation,
} from "./event-location";

export type { ResolvedEventLocation };

const EVENTS_DIR = path.join(process.cwd(), "src/data/events");

let cachedEvents: CoLocatedEvent[] | null = null;

/**
 * Loads every associated event from src/data/events/*.json. The directory may
 * not exist yet on a fresh checkout (events are optional), so a missing
 * directory is treated as "no events" rather than an error.
 */
export function loadAllEvents(): CoLocatedEvent[] {
  if (cachedEvents) return cachedEvents;
  if (!fs.existsSync(EVENTS_DIR)) {
    cachedEvents = [];
    return cachedEvents;
  }
  const files = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith(".json"));
  const events: CoLocatedEvent[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, file), "utf-8")) as unknown;
    const parsed = coLocatedEventFileSchema.parse(raw);
    events.push(...parsed.events);
  }
  events.sort((a, b) => a.name.localeCompare(b.name));
  cachedEvents = events;
  return events;
}

export function getAllEvents(): CoLocatedEvent[] {
  return loadAllEvents();
}

export function getEventBySlug(slug: string): CoLocatedEvent | undefined {
  return loadAllEvents().find((e) => e.slug === slug);
}

export function getEventsForEdition(editionSlug: string): CoLocatedEvent[] {
  return loadAllEvents().filter((e) => e.parentConferenceEditionSlug === editionSlug);
}

export function getEventsForSeries(seriesId: string): CoLocatedEvent[] {
  return loadAllEvents().filter((e) => e.parentConferenceSeriesId === seriesId);
}

/**
 * Server-only convenience wrapper: looks the parent edition up via
 * getEditionBySlug() (filesystem access) and delegates to the pure
 * resolveEventLocation() in event-location.ts. Client Components must import
 * the pure version from "@/lib/event-location" directly (passing the parent
 * edition they already have as a prop) rather than this file, which pulls in
 * `node:fs` and cannot be bundled for the browser.
 */
export function resolveEventLocation(event: CoLocatedEvent): ResolvedEventLocation {
  return resolveEventLocationPure(event, getEditionBySlug(event.parentConferenceEditionSlug));
}

export interface OrphanedEventError {
  eventId: string;
  eventSlug: string;
  parentConferenceEditionSlug: string;
  reason: string;
}

/**
 * Validates that every event's parent edition actually exists. Used by both
 * the validate-data script (fails the build) and tests.
 */
export function findOrphanedEvents(
  events: CoLocatedEvent[],
  editionSlugs: Set<string>,
): OrphanedEventError[] {
  const orphans: OrphanedEventError[] = [];
  for (const event of events) {
    if (!editionSlugs.has(event.parentConferenceEditionSlug)) {
      orphans.push({
        eventId: event.id,
        eventSlug: event.slug,
        parentConferenceEditionSlug: event.parentConferenceEditionSlug,
        reason: `No conference edition with slug "${event.parentConferenceEditionSlug}" exists.`,
      });
    }
  }
  return orphans;
}
