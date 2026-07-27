import { describe, expect, it } from "vitest";
import { migratePersonalPaperRecord, personalPaperSchema } from "@/lib/paper-schema";

describe("migratePersonalPaperRecord", () => {
  it("upgrades a schema-v1 plain-string currentTarget to the structured v2 shape", () => {
    const v1Record = {
      id: "p1",
      title: "A paper",
      currentTarget: "neurips-2026",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const migrated = migratePersonalPaperRecord(v1Record) as { currentTarget?: unknown };
    expect(migrated.currentTarget).toEqual({ type: "main-conference", label: "neurips-2026" });
  });

  it("converts an empty-string v1 target to undefined rather than an empty object", () => {
    const migrated = migratePersonalPaperRecord({ currentTarget: "" }) as {
      currentTarget?: unknown;
    };
    expect(migrated.currentTarget).toBeUndefined();
  });

  it("leaves an already-structured v2 currentTarget untouched", () => {
    const v2Record = {
      id: "p1",
      title: "A paper",
      currentTarget: { type: "workshop", label: "Some Workshop" },
    };
    const migrated = migratePersonalPaperRecord(v2Record) as { currentTarget?: unknown };
    expect(migrated.currentTarget).toEqual({ type: "workshop", label: "Some Workshop" });
  });

  it("passes through non-object input unchanged", () => {
    expect(migratePersonalPaperRecord(null)).toBeNull();
    expect(migratePersonalPaperRecord("not an object")).toBe("not an object");
  });

  it("produces output that validates against the current personalPaperSchema", () => {
    const migrated = migratePersonalPaperRecord({
      id: "p1",
      title: "A paper",
      currentTarget: "workshop-name",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = personalPaperSchema.safeParse(migrated);
    expect(result.success).toBe(true);
  });
});

describe("personalPaperSchema target types", () => {
  it("accepts every documented target type", () => {
    const targetTypes = [
      "main-conference",
      "workshop",
      "shared-task",
      "competition",
      "special-session",
      "doctoral-consortium",
      "demo-track",
    ];
    for (const type of targetTypes) {
      const result = personalPaperSchema.safeParse({
        id: "p1",
        title: "A paper",
        currentTarget: { type, label: "Some venue" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    }
  });
});
