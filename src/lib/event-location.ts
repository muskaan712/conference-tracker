import type { CoLocatedEvent, ConferenceEdition } from "./schema";

export interface ResolvedEventLocation {
  city?: string;
  country?: string;
  countryCode?: string;
  continent?: string;
  venueName?: string;
  mode: "physical" | "online" | "hybrid" | "location-not-announced";
  /** True when this location comes from the parent edition rather than an event-specific override. */
  inherited: boolean;
}

/**
 * Resolves an event's effective location: its own `locationOverride` if
 * present, otherwise the given parent conference edition's venue/location
 * fields — see Part 1 "Event location inheritance". Deliberately pure (the
 * caller supplies `parentEdition` rather than this function looking it up
 * itself) so it has zero filesystem dependency and can be imported safely
 * from Client Components (event-directory.tsx, resubmission-planner.tsx,
 * timeline-view.tsx, etc.) as well as Server Components.
 */
export function resolveEventLocation(
  event: CoLocatedEvent,
  parentEdition: ConferenceEdition | undefined,
): ResolvedEventLocation {
  if (event.locationOverride) {
    const override = event.locationOverride;
    return {
      city: override.city,
      country: override.country,
      countryCode: override.countryCode,
      continent: override.continent,
      venueName: override.venueName,
      mode: override.mode ?? "location-not-announced",
      inherited: false,
    };
  }

  if (!parentEdition) {
    return { mode: "location-not-announced", inherited: true };
  }
  return {
    city: parentEdition.city,
    country: parentEdition.country,
    countryCode: parentEdition.countryCode,
    continent: parentEdition.continent,
    venueName: parentEdition.venueName,
    mode: parentEdition.isHybrid
      ? "hybrid"
      : parentEdition.isOnline
        ? "online"
        : parentEdition.city
          ? "physical"
          : "location-not-announced",
    inherited: true,
  };
}
