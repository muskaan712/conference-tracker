import { describe, expect, it } from "vitest";
import { planEventResubmissions } from "@/lib/event-planner";
import { makeDate, makeEdition, makeEvent } from "./fixtures";

const parentEdition = makeEdition({
  slug: "exc-2026",
  seriesId: "exc",
  ranking: { tier: "A" },
  acronym: "EXC",
  editionYear: 2026,
  countryCode: "DE",
  continent: "Europe",
});
const editions = [parentEdition];

describe("planEventResubmissions", () => {
  const notificationDate = "2026-01-01";

  it("finds an event whose submission deadline leaves enough buffer after notification", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const results = planEventResubmissions(
      [event],
      {
        expectedNotificationDate: notificationDate,
        researchAreas: [],
        geographicPreference: "none",
        minBufferDays: 7,
      },
      editions,
    );
    expect(results).toHaveLength(1);
    expect(results[0].parentTier).toBe("A");
    expect(results[0].event.ranking.tier).toBe("Unclassified");
  });

  it("excludes an event whose deadline is too soon after notification", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      dates: [makeDate("workshop-paper", "2026-01-03T00:00:00")],
    });
    const results = planEventResubmissions(
      [event],
      {
        expectedNotificationDate: notificationDate,
        researchAreas: [],
        geographicPreference: "none",
        minBufferDays: 30,
      },
      editions,
    );
    expect(results).toHaveLength(0);
  });

  it("filters to workshops only when eventTypes is set", () => {
    const workshop = makeEvent({
      id: "w",
      slug: "w",
      type: "workshop",
      parentConferenceEditionSlug: "exc-2026",
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const sharedTask = makeEvent({
      id: "s",
      slug: "s",
      type: "shared-task",
      parentConferenceEditionSlug: "exc-2026",
      dates: [makeDate("shared-task-submission", "2026-02-01T00:00:00")],
    });
    const results = planEventResubmissions(
      [workshop, sharedTask],
      {
        expectedNotificationDate: notificationDate,
        researchAreas: [],
        geographicPreference: "none",
        minBufferDays: 7,
        eventTypes: ["workshop"],
      },
      editions,
    );
    expect(results.map((r) => r.event.slug)).toEqual(["w"]);
  });

  it("filters to archival-only events", () => {
    const archival = makeEvent({
      id: "archival",
      slug: "archival",
      parentConferenceEditionSlug: "exc-2026",
      proceedings: { status: "archival", indexing: [] },
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const nonArchival = makeEvent({
      id: "non-archival",
      slug: "non-archival",
      parentConferenceEditionSlug: "exc-2026",
      proceedings: { status: "non-archival", indexing: [] },
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const results = planEventResubmissions(
      [archival, nonArchival],
      {
        expectedNotificationDate: notificationDate,
        researchAreas: [],
        geographicPreference: "none",
        minBufferDays: 7,
        archivalOnly: true,
      },
      editions,
    );
    expect(results.map((r) => r.event.slug)).toEqual(["archival"]);
  });

  it("never treats an Unclassified event as equivalent to a ranked one by filtering on eventTiers", () => {
    const event = makeEvent({
      parentConferenceEditionSlug: "exc-2026",
      ranking: { tier: "Unclassified" },
      dates: [makeDate("workshop-paper", "2026-02-01T00:00:00")],
    });
    const results = planEventResubmissions(
      [event],
      {
        expectedNotificationDate: notificationDate,
        researchAreas: [],
        geographicPreference: "none",
        minBufferDays: 7,
        eventTiers: ["A*"],
      },
      editions,
    );
    expect(results).toHaveLength(0);
  });
});
