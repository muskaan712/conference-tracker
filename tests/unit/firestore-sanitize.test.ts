import { describe, expect, it } from "vitest";
import { sanitizeForFirestore } from "@/lib/firebase/firestore-sanitize";
import { cloudPaperSchema, CLOUD_SCHEMA_VERSION } from "@/lib/firebase/firestore-schema";
import type { CloudPaper } from "@/lib/firebase/firestore-schema";

function basePaper(overrides: Partial<CloudPaper> = {}): CloudPaper {
  return {
    ownerUid: "uid-1",
    schemaVersion: CLOUD_SCHEMA_VERSION,
    id: "p1",
    title: "A paper",
    authors: [],
    researchAreas: [],
    fallbackConferences: [],
    minAcceptableTier: "Unclassified",
    europePreference: "none",
    stage: "Idea",
    importantDates: [],
    tasks: [],
    colorLabel: "slate",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sanitizeForFirestore", () => {
  it("removes a top-level undefined property", () => {
    expect(sanitizeForFirestore({ title: "Paper", currentTarget: undefined })).toEqual({
      title: "Paper",
    });
  });

  it("removes a nested undefined property", () => {
    const input = {
      title: "Paper",
      nested: { slug: undefined, label: "ACL" },
    };
    expect(sanitizeForFirestore(input)).toEqual({
      title: "Paper",
      nested: { label: "ACL" },
    });
  });

  it("matches the exact example from the bug report", () => {
    const input = {
      title: "Paper",
      currentTarget: undefined,
      nested: {
        slug: undefined,
        label: "ACL",
      },
    };
    expect(sanitizeForFirestore(input)).toEqual({
      title: "Paper",
      nested: {
        label: "ACL",
      },
    });
  });

  it("removes an optional currentTarget entirely when unset", () => {
    const paper = basePaper({ currentTarget: undefined });
    const sanitized = sanitizeForFirestore(paper);
    expect(sanitized).not.toHaveProperty("currentTarget");
  });

  it("removes only currentTarget.slug when the target has no slug", () => {
    const paper = basePaper({
      currentTarget: { type: "main-conference", label: "NeurIPS 2026", slug: undefined },
    });
    const sanitized = sanitizeForFirestore(paper);
    expect(sanitized.currentTarget).toEqual({ type: "main-conference", label: "NeurIPS 2026" });
    expect(sanitized.currentTarget).not.toHaveProperty("slug");
  });

  it("removes a missing codeName", () => {
    const paper = basePaper({ codeName: undefined });
    const sanitized = sanitizeForFirestore(paper);
    expect(sanitized).not.toHaveProperty("codeName");
  });

  it("removes a missing notes", () => {
    const paper = basePaper({ notes: undefined });
    const sanitized = sanitizeForFirestore(paper);
    expect(sanitized).not.toHaveProperty("notes");
  });

  it("preserves null, false, and zero rather than stripping them", () => {
    const input = { a: null, b: false, c: 0, d: "", e: undefined };
    expect(sanitizeForFirestore(input)).toEqual({ a: null, b: false, c: 0, d: "" });
  });

  it("preserves arrays (including empty ones) untouched", () => {
    const input = { tags: ["a", "b"], empty: [] as string[] };
    expect(sanitizeForFirestore(input)).toEqual({ tags: ["a", "b"], empty: [] });
  });

  it("recurses into objects nested inside arrays, stripping their undefined fields", () => {
    const input = { tasks: [{ id: "t1", label: "Task", done: undefined }] };
    expect(sanitizeForFirestore(input)).toEqual({ tasks: [{ id: "t1", label: "Task" }] });
  });

  it("throws a clear error rather than silently dropping an undefined array element", () => {
    const input = { tags: ["a", undefined, "b"] };
    expect(() => sanitizeForFirestore(input)).toThrow(/array element/i);
  });

  it("does not mutate the input object", () => {
    const input: { title: string; currentTarget?: string; nested: { slug?: string } } = {
      title: "Paper",
      currentTarget: undefined,
      nested: { slug: undefined },
    };
    const frozenNested = input.nested;
    sanitizeForFirestore(input);
    expect(input).toHaveProperty("currentTarget");
    expect(input.nested).toBe(frozenNested);
    expect(input.nested).toHaveProperty("slug");
  });

  it("preserves ownerUid and schemaVersion", () => {
    const paper = basePaper();
    const sanitized = sanitizeForFirestore(paper);
    expect(sanitized.ownerUid).toBe("uid-1");
    expect(sanitized.schemaVersion).toBe(CLOUD_SCHEMA_VERSION);
  });

  it("a paper without currentTarget sanitizes and validates against cloudPaperSchema", () => {
    const paper = basePaper({ currentTarget: undefined });
    const sanitized = sanitizeForFirestore(paper);
    const result = cloudPaperSchema.safeParse(sanitized);
    expect(result.success).toBe(true);
  });

  it("a paper with currentTarget but no slug sanitizes and validates against cloudPaperSchema", () => {
    const paper = basePaper({
      currentTarget: { type: "workshop", label: "Some Workshop", slug: undefined },
    });
    const sanitized = sanitizeForFirestore(paper);
    const result = cloudPaperSchema.safeParse(sanitized);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentTarget).toEqual({ type: "workshop", label: "Some Workshop" });
    }
  });
});
