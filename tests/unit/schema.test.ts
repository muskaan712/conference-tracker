import { describe, expect, it } from "vitest";
import {
  conferenceEditionSchema,
  conferenceDateSchema,
  rankingSchema,
  discoverySourceSchema,
} from "@/lib/schema";
import { makeDate, makeEdition } from "./fixtures";

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
