import { describe, expect, it } from "vitest";
import { applyEventFilters, matchesEventFilters, parentTierFor } from "@/lib/event-filtering";
import { makeDate, makeEdition, makeEvent } from "./fixtures";

const europeEdition = makeEdition({
  slug: "exc-2026",
  seriesId: "exc",
  ranking: { tier: "A*" },
  countryCode: "DE",
  continent: "Europe",
  city: "Berlin",
});
const editions = [europeEdition];

describe("parentTierFor", () => {
  it("reads the parent conference's own tier, entirely separate from the event's tier", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      ranking: { tier: "Unclassified" },
    });
    expect(parentTierFor(event, editions)).toBe("A*");
    expect(event.ranking.tier).toBe("Unclassified");
  });

  it("returns undefined when the parent edition isn't in the supplied list", () => {
    const event = makeEvent({ parentConferenceEditionSlug: "missing" });
    expect(parentTierFor(event, editions)).toBeUndefined();
  });
});

describe("matchesEventFilters", () => {
  it("matches by keyword against name/acronym/description", () => {
    const event = makeEvent({ name: "Blackbox Interpretability Workshop", acronym: "BBW" });
    expect(matchesEventFilters(event, { keyword: "interpretability" })).toBe(true);
    expect(matchesEventFilters(event, { keyword: "unrelated" })).toBe(false);
  });

  it("filters by event type", () => {
    const event = makeEvent({ type: "shared-task" });
    expect(matchesEventFilters(event, { eventTypes: ["shared-task"] })).toBe(true);
    expect(matchesEventFilters(event, { eventTypes: ["tutorial"] })).toBe(false);
  });

  it("distinguishes parentTiers from eventTiers filters", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      ranking: { tier: "Unclassified" },
    });
    // Parent is A*, event itself is Unclassified — filtering by parentTiers: ["A*"] should match,
    // filtering by eventTiers: ["A*"] should not (never conflate the two).
    expect(matchesEventFilters(event, { parentTiers: ["A*"] }, new Date(), editions)).toBe(true);
    expect(matchesEventFilters(event, { eventTiers: ["A*"] }, new Date(), editions)).toBe(false);
    expect(matchesEventFilters(event, { eventTiers: ["Unclassified"] }, new Date(), editions)).toBe(
      true,
    );
  });

  it("filters by research area", () => {
    const event = makeEvent({ researchAreas: ["nlp"] });
    expect(matchesEventFilters(event, { researchAreas: ["nlp"] })).toBe(true);
    expect(matchesEventFilters(event, { researchAreas: ["computer-vision"] })).toBe(false);
  });

  it("filters Europe vs outside-Europe using the resolved (possibly inherited) location", () => {
    const event = makeEvent({ parentConferenceEditionSlug: "exc-2026" });
    expect(matchesEventFilters(event, { europeOnly: true }, new Date(), editions)).toBe(true);
    expect(matchesEventFilters(event, { outsideEuropeOnly: true }, new Date(), editions)).toBe(
      false,
    );
  });

  it("filters archival/non-archival/unknown proceedings", () => {
    const archival = makeEvent({ proceedings: { status: "archival", indexing: [] } });
    const unknown = makeEvent({});
    expect(matchesEventFilters(archival, { archivalOnly: true })).toBe(true);
    expect(matchesEventFilters(unknown, { archivalOnly: true })).toBe(false);
    expect(matchesEventFilters(unknown, { unknownProceedingsOnly: true })).toBe(true);
  });

  it("filters by deadline type present in the event's own dates", () => {
    const event = makeEvent({ dates: [makeDate("workshop-paper", "2026-05-01T00:00:00")] });
    expect(matchesEventFilters(event, { deadlineTypes: ["workshop-paper"] })).toBe(true);
    expect(matchesEventFilters(event, { deadlineTypes: ["shared-task-submission"] })).toBe(false);
  });

  it("applyEventFilters filters a list down using the same rules", () => {
    const events = [
      makeEvent({ id: "a", slug: "a", type: "workshop" }),
      makeEvent({ id: "b", slug: "b", type: "tutorial" }),
    ];
    expect(applyEventFilters(events, { eventTypes: ["tutorial"] }).map((e) => e.slug)).toEqual([
      "b",
    ]);
  });
});
