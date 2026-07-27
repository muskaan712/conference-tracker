import { describe, expect, it } from "vitest";
import { diffEditionFields, hasChanges } from "@/lib/diff";
import { makeDate, makeEdition } from "./fixtures";

describe("diffEditionFields", () => {
  it("reports no changes for identical editions", () => {
    const edition = makeEdition();
    expect(diffEditionFields(edition, edition)).toEqual([]);
  });

  it("detects a scalar field change", () => {
    const before = makeEdition({ venueName: "Old Hall" });
    const after = makeEdition({ venueName: "New Hall" });
    const changes = diffEditionFields(before, after);
    expect(changes).toContainEqual({
      field: "venueName",
      previousValue: "Old Hall",
      newValue: "New Hall",
    });
  });

  it("detects a ranking tier change", () => {
    const before = makeEdition({ ranking: { tier: "B" } });
    const after = makeEdition({ ranking: { tier: "A" } });
    const changes = diffEditionFields(before, after);
    expect(changes).toContainEqual({ field: "ranking.tier", previousValue: "B", newValue: "A" });
  });

  it("detects an added date", () => {
    const before = makeEdition({ dates: [] });
    const after = makeEdition({ dates: [makeDate("full-paper", "2026-05-06T00:00:00.000Z")] });
    const changes = diffEditionFields(before, after);
    expect(changes.some((c) => c.field.startsWith("dates.") && c.previousValue === null)).toBe(
      true,
    );
  });

  it("detects a removed date", () => {
    const before = makeEdition({ dates: [makeDate("full-paper", "2026-05-06T00:00:00.000Z")] });
    const after = makeEdition({ dates: [] });
    const changes = diffEditionFields(before, after);
    expect(changes.some((c) => c.field.startsWith("dates.") && c.newValue === null)).toBe(true);
  });

  it("detects a changed date's startsAt", () => {
    const d = makeDate("full-paper", "2026-05-06T00:00:00.000Z");
    const before = makeEdition({ dates: [d] });
    const after = makeEdition({ dates: [{ ...d, startsAt: "2026-05-10T00:00:00.000Z" }] });
    const changes = diffEditionFields(before, after);
    expect(changes.some((c) => c.field === `dates.${d.id}.startsAt`)).toBe(true);
  });

  it("detects a changed date's verificationStatus", () => {
    const d = makeDate("full-paper", "2026-05-06T00:00:00.000Z", {
      verificationStatus: "unverified",
    });
    const before = makeEdition({ dates: [d] });
    const after = makeEdition({ dates: [{ ...d, verificationStatus: "official" }] });
    const changes = diffEditionFields(before, after);
    expect(changes.some((c) => c.field === `dates.${d.id}.verificationStatus`)).toBe(true);
  });

  it("treats an undefined previous edition as everything being new", () => {
    const after = makeEdition();
    const changes = diffEditionFields(undefined, after);
    expect(changes.length).toBeGreaterThan(0);
  });
});

describe("hasChanges", () => {
  it("returns false when nothing differs", () => {
    const edition = makeEdition();
    expect(hasChanges(edition, edition)).toBe(false);
  });
  it("returns true when something differs", () => {
    const before = makeEdition({ notes: "a" });
    const after = makeEdition({ notes: "b" });
    expect(hasChanges(before, after)).toBe(true);
  });
});
