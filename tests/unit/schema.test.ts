import { describe, expect, it } from "vitest";
import {
  conferenceEditionSchema,
  conferenceDateSchema,
  rankingSchema,
  discoverySourceSchema,
  coLocatedEventSchema,
} from "@/lib/schema";
import { makeDate, makeEdition, makeEvent } from "./fixtures";

describe("conferenceEditionSchema", () => {
  it("accepts a well-formed edition", () => {
    const result = conferenceEditionSchema.safeParse(makeEdition());
    expect(result.success).toBe(true);
  });

  it("rejects an edition with an invalid tier", () => {
    const bad = { ...makeEdition(), ranking: { tier: "S+" } };
    expect(conferenceEditionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an edition missing required fields", () => {
    const full = makeEdition() as Partial<ReturnType<typeof makeEdition>>;
    delete full.name;
    expect(conferenceEditionSchema.safeParse(full).success).toBe(false);
  });

  it("rejects an edition with an empty researchAreas array", () => {
    const bad = makeEdition({ researchAreas: [] });
    expect(conferenceEditionSchema.safeParse(bad).success).toBe(false);
  });

  it("applies defaults for optional array fields", () => {
    const minimal = {
      name: "Min Conf",
      acronym: "MC",
      slug: "mc-2026",
      editionYear: 2026,
      description: "desc",
      seriesId: "mc",
      ranking: { tier: "Unclassified" },
      researchAreas: ["ai"],
      geographicCategory: "Location not announced",
      locationVerificationStatus: "unverified",
      dates: [],
    };
    const result = conferenceEditionSchema.parse(minimal);
    expect(result.tracks).toEqual([]);
    expect(result.paperTypes).toEqual([]);
    expect(result.isOnline).toBe(false);
    expect(result.referenceDates).toEqual([]);
  });
});

describe("conferenceDateSchema", () => {
  it("accepts a well-formed date", () => {
    expect(
      conferenceDateSchema.safeParse(makeDate("full-paper", "2026-05-06T00:00:00.000Z")).success,
    ).toBe(true);
  });

  it("rejects an invalid deadline type", () => {
    const bad = { ...makeDate("full-paper", "2026-05-06T00:00:00.000Z"), type: "not-a-real-type" };
    expect(conferenceDateSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid verificationStatus", () => {
    const bad = {
      ...makeDate("full-paper", "2026-05-06T00:00:00.000Z"),
      verificationStatus: "definitely",
    };
    expect(conferenceDateSchema.safeParse(bad).success).toBe(false);
  });
});

describe("rankingSchema", () => {
  it("only requires a tier", () => {
    expect(rankingSchema.safeParse({ tier: "A" }).success).toBe(true);
  });
  it("rejects a malformed sourceUrl", () => {
    expect(rankingSchema.safeParse({ tier: "A", sourceUrl: "not-a-url" }).success).toBe(false);
  });
});

describe("discoverySourceSchema", () => {
  it("accepts a well-formed source", () => {
    const source = {
      id: "example-source",
      name: "Example",
      url: "https://example.org",
      type: "official-conference",
      enabled: true,
      trustLevel: "official",
      scanFrequency: "weekly",
    };
    expect(discoverySourceSchema.safeParse(source).success).toBe(true);
  });

  it("rejects an invalid trustLevel", () => {
    const source = {
      id: "example-source",
      name: "Example",
      url: "https://example.org",
      type: "official-conference",
      enabled: true,
      trustLevel: "trust-me-bro",
      scanFrequency: "weekly",
    };
    expect(discoverySourceSchema.safeParse(source).success).toBe(false);
  });
});

describe("coLocatedEventSchema", () => {
  it("accepts a well-formed event", () => {
    expect(coLocatedEventSchema.safeParse(makeEvent()).success).toBe(true);
  });

  it("rejects an invalid event type", () => {
    const bad = { ...makeEvent(), type: "keynote-panel" };
    expect(coLocatedEventSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid lifecycle status", () => {
    const bad = { ...makeEvent(), lifecycleStatus: "definitely-happening" };
    expect(coLocatedEventSchema.safeParse(bad).success).toBe(false);
  });

  it("requires parentConferenceSeriesId and parentConferenceEditionSlug", () => {
    const full = makeEvent() as Partial<ReturnType<typeof makeEvent>>;
    delete full.parentConferenceEditionSlug;
    expect(coLocatedEventSchema.safeParse(full).success).toBe(false);
  });

  it("defaults ranking to Unclassified-shaped input without requiring a source", () => {
    const result = coLocatedEventSchema.safeParse(makeEvent({ ranking: { tier: "Unclassified" } }));
    expect(result.success).toBe(true);
  });

  it("accepts an event with a location override distinct from the parent", () => {
    const result = coLocatedEventSchema.safeParse(
      makeEvent({ locationOverride: { mode: "online" } }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a proceedings block with a valid status", () => {
    const result = coLocatedEventSchema.safeParse(
      makeEvent({ proceedings: { status: "archival", indexing: ["DBLP"] } }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an invalid proceedings status", () => {
    const bad = makeEvent({ proceedings: { status: "very-official", indexing: [] } as never });
    expect(coLocatedEventSchema.safeParse(bad).success).toBe(false);
  });
});
