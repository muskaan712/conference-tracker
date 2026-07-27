import { describe, expect, it } from "vitest";
import { diffEventFields } from "@/lib/event-diff";
import { makeDate, makeEvent } from "./fixtures";

describe("diffEventFields", () => {
  it("reports no changes when nothing differs", () => {
    const event = makeEvent();
    expect(diffEventFields(event, event)).toEqual([]);
  });

  it("detects a scalar field change", () => {
    const before = makeEvent({ lifecycleStatus: "unverified" });
    const after = makeEvent({ lifecycleStatus: "officially-announced" });
    const changes = diffEventFields(before, after);
    expect(changes).toContainEqual({
      field: "lifecycleStatus",
      previousValue: "unverified",
      newValue: "officially-announced",
    });
  });

  it("detects a ranking tier change", () => {
    const before = makeEvent({ ranking: { tier: "Unclassified" } });
    const after = makeEvent({ ranking: { tier: "B", source: "Some registry" } });
    const changes = diffEventFields(before, after);
    expect(changes).toContainEqual({
      field: "ranking.tier",
      previousValue: "Unclassified",
      newValue: "B",
    });
  });

  it("detects a proceedings status change", () => {
    const before = makeEvent({});
    const after = makeEvent({ proceedings: { status: "archival", indexing: [] } });
    const changes = diffEventFields(before, after);
    expect(changes).toContainEqual({
      field: "proceedings.status",
      previousValue: null,
      newValue: "archival",
    });
  });

  it("detects an added date and a changed date", () => {
    const date = makeDate("workshop-paper", "2026-05-01T00:00:00");
    const before = makeEvent({ dates: [date] });
    const changedDate = { ...date, startsAt: "2026-05-15T00:00:00" };
    const after = makeEvent({ dates: [changedDate] });
    const changes = diffEventFields(before, after);
    expect(changes.some((c) => c.field === `dates.${date.id}.startsAt`)).toBe(true);
  });

  it("detects a removed date", () => {
    const date = makeDate("workshop-paper", "2026-05-01T00:00:00");
    const before = makeEvent({ dates: [date] });
    const after = makeEvent({ dates: [] });
    const changes = diffEventFields(before, after);
    expect(changes.some((c) => c.field === `dates.${date.id}` && c.newValue === null)).toBe(true);
  });

  it("treats an undefined previous event as everything being new", () => {
    const event = makeEvent({ name: "New Workshop" });
    const changes = diffEventFields(undefined, event);
    expect(changes.some((c) => c.field === "name" && c.previousValue === null)).toBe(true);
  });
});
