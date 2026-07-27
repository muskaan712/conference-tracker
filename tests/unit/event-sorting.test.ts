import { describe, expect, it } from "vitest";
import { sortEvents } from "@/lib/event-sorting";
import { makeDate, makeEdition, makeEvent } from "./fixtures";

const editionA = makeEdition({
  slug: "a-2026",
  seriesId: "a",
  ranking: { tier: "A*" },
  name: "Conference A",
});
const editionB = makeEdition({
  slug: "b-2026",
  seriesId: "b",
  ranking: { tier: "C" },
  name: "Conference B",
});
const editions = [editionA, editionB];

describe("sortEvents", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("sorts by nearest submission deadline", () => {
    const soon = makeEvent({
      id: "soon",
      slug: "soon",
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const later = makeEvent({
      id: "later",
      slug: "later",
      dates: [makeDate("workshop-paper", "2026-06-01T00:00:00")],
    });
    const sorted = sortEvents([later, soon], "nearest-submission", now);
    expect(sorted.map((e) => e.slug)).toEqual(["soon", "later"]);
  });

  it("sorts by event name alphabetically", () => {
    const b = makeEvent({ id: "b", slug: "b", name: "Beta Workshop" });
    const a = makeEvent({ id: "a", slug: "a", name: "Alpha Workshop" });
    expect(sortEvents([b, a], "name", now).map((e) => e.name)).toEqual([
      "Alpha Workshop",
      "Beta Workshop",
    ]);
  });

  it("sorts by parent conference tier without touching the event's own tier", () => {
    const eventAtA = makeEvent({
      id: "at-a",
      slug: "at-a",
      parentConferenceEditionSlug: "a-2026",
      ranking: { tier: "Unclassified" },
    });
    const eventAtB = makeEvent({
      id: "at-b",
      slug: "at-b",
      parentConferenceEditionSlug: "b-2026",
      ranking: { tier: "Unclassified" },
    });
    const sorted = sortEvents([eventAtB, eventAtA], "parent-tier", now, editions);
    expect(sorted.map((e) => e.slug)).toEqual(["at-a", "at-b"]);
    expect(sorted.every((e) => e.ranking.tier === "Unclassified")).toBe(true);
  });

  it("sorts by the event's own independent tier", () => {
    const highTierEvent = makeEvent({ id: "hi", slug: "hi", ranking: { tier: "A*" } });
    const lowTierEvent = makeEvent({ id: "lo", slug: "lo", ranking: { tier: "C" } });
    const sorted = sortEvents([lowTierEvent, highTierEvent], "event-tier", now);
    expect(sorted.map((e) => e.slug)).toEqual(["hi", "lo"]);
  });

  it("sorts by event type", () => {
    const tutorial = makeEvent({ id: "t", slug: "t", type: "tutorial" });
    const workshop = makeEvent({ id: "w", slug: "w", type: "workshop" });
    const sorted = sortEvents([workshop, tutorial], "event-type", now);
    expect(sorted[0].type <= sorted[1].type).toBe(true);
  });

  it("sorts by parent conference name", () => {
    const eventAtA = makeEvent({ id: "at-a", slug: "at-a", parentConferenceEditionSlug: "a-2026" });
    const eventAtB = makeEvent({ id: "at-b", slug: "at-b", parentConferenceEditionSlug: "b-2026" });
    const sorted = sortEvents([eventAtB, eventAtA], "parent-conference", now, editions);
    expect(sorted.map((e) => e.slug)).toEqual(["at-a", "at-b"]);
  });
});
