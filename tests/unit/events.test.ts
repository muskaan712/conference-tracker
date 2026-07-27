import { describe, expect, it, vi } from "vitest";
import { makeEdition, makeEvent } from "./fixtures";

const mockEdition = makeEdition({
  slug: "exc-2026",
  city: "Berlin",
  country: "Germany",
  countryCode: "DE",
  continent: "Europe",
  venueName: "Big Hall",
  isOnline: false,
  isHybrid: false,
});

vi.mock("@/lib/conferences", () => ({
  getEditionBySlug: (slug: string) => (slug === "exc-2026" ? mockEdition : undefined),
}));

const { resolveEventLocation, findOrphanedEvents } = await import("@/lib/events");

describe("resolveEventLocation", () => {
  it("inherits the parent edition's location when there is no override", () => {
    const event = makeEvent({ parentConferenceEditionSlug: "exc-2026" });
    const location = resolveEventLocation(event);
    expect(location.inherited).toBe(true);
    expect(location.city).toBe("Berlin");
    expect(location.countryCode).toBe("DE");
    expect(location.mode).toBe("physical");
  });

  it("uses an event-specific override instead of the parent's location", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      locationOverride: { city: "Online", mode: "online" },
    });
    const location = resolveEventLocation(event);
    expect(location.inherited).toBe(false);
    expect(location.mode).toBe("online");
    expect(location.city).toBe("Online");
  });

  it("falls back to 'location-not-announced' when the parent edition can't be found", () => {
    const event = makeEvent({ parentConferenceEditionSlug: "missing-edition" });
    const location = resolveEventLocation(event);
    expect(location.mode).toBe("location-not-announced");
    expect(location.inherited).toBe(true);
  });
});

describe("findOrphanedEvents", () => {
  it("flags an event whose parent edition slug doesn't exist", () => {
    const events = [makeEvent({ parentConferenceEditionSlug: "does-not-exist" })];
    const orphans = findOrphanedEvents(events, new Set(["exc-2026"]));
    expect(orphans).toHaveLength(1);
    expect(orphans[0].parentConferenceEditionSlug).toBe("does-not-exist");
  });

  it("does not flag an event whose parent edition slug is known", () => {
    const events = [makeEvent({ parentConferenceEditionSlug: "exc-2026" })];
    const orphans = findOrphanedEvents(events, new Set(["exc-2026"]));
    expect(orphans).toHaveLength(0);
  });
});
