import { describe, expect, it } from "vitest";
import {
  evaluateFieldCandidate,
  isSafeToMerge,
  type FieldCandidateEvidence,
} from "../../scripts/shared/merge-safeguards";

function base(overrides: Partial<FieldCandidateEvidence> = {}): FieldCandidateEvidence {
  return {
    fieldName: "dates.full-paper",
    existingValue: null,
    proposedValue: "2026-05-01",
    sourceTrustLevel: "official",
    confidence: "high",
    editionMatched: true,
    ...overrides,
  };
}

describe("evaluateFieldCandidate merge safeguards", () => {
  it("rejects a candidate with no matching edition", () => {
    const decision = evaluateFieldCandidate(base({ editionMatched: false }));
    expect(decision.action).toBe("reject");
  });

  it("rejects an empty scraped value overwriting a populated value", () => {
    const decision = evaluateFieldCandidate(
      base({ existingValue: "2026-05-01", proposedValue: "" }),
    );
    expect(decision.action).toBe("reject");
  });

  it("allows an empty proposed value when there was nothing there before", () => {
    const decision = evaluateFieldCandidate(base({ existingValue: null, proposedValue: "" }));
    expect(decision.action).not.toBe("reject");
  });

  it("rejects a secondary source overwriting an official value", () => {
    const decision = evaluateFieldCandidate(
      base({
        existingValue: "2026-05-01",
        existingVerificationStatus: "official",
        sourceTrustLevel: "secondary",
      }),
    );
    expect(decision.action).toBe("reject");
  });

  it("rejects a discovery-only source overwriting an official value", () => {
    const decision = evaluateFieldCandidate(
      base({
        existingValue: "2026-05-01",
        existingVerificationStatus: "official",
        sourceTrustLevel: "discovery-only",
        confidence: "low",
      }),
    );
    expect(decision.action).toBe("reject");
  });

  it("rejects downgrading an official value to tentative", () => {
    const decision = evaluateFieldCandidate(
      base({
        existingValue: "2026-05-01",
        existingVerificationStatus: "official",
        proposedVerificationStatus: "tentative",
      }),
    );
    expect(decision.action).toBe("reject");
  });

  it("rejects a previous-cycle date being introduced as a new current date", () => {
    const decision = evaluateFieldCandidate(
      base({ existingValue: null, proposedVerificationStatus: "previous-cycle" }),
    );
    expect(decision.action).toBe("reject");
  });

  it("rejects a workshop/track-specific date overwriting a main-track field", () => {
    const decision = evaluateFieldCandidate(
      base({ targetsMainTrackField: true, isAssociatedEventField: true }),
    );
    expect(decision.action).toBe("reject");
  });

  it("rejects a ranking change with no cited source", () => {
    const decision = evaluateFieldCandidate(base({ isRankingChange: true, sourceUrl: undefined }));
    expect(decision.action).toBe("reject");
  });

  it("holds a discovery-only ranking change as report-only even with a source", () => {
    const decision = evaluateFieldCandidate(
      base({
        isRankingChange: true,
        sourceUrl: "https://example.com",
        sourceTrustLevel: "discovery-only",
      }),
    );
    expect(decision.action).toBe("report-only");
  });

  it("holds a proceedings status change as report-only without evidence", () => {
    const decision = evaluateFieldCandidate(
      base({ isProceedingsChange: true, sourceUrl: undefined }),
    );
    expect(decision.action).toBe("report-only");
  });

  it("marks a conflicting-source candidate as report-only rather than picking one", () => {
    const decision = evaluateFieldCandidate(base({ hasConflictingSource: true }));
    expect(decision.action).toBe("report-only");
  });

  it("keeps low-confidence candidates report-only regardless of anything else", () => {
    const decision = evaluateFieldCandidate(
      base({ confidence: "low", sourceTrustLevel: "official" }),
    );
    expect(decision.action).toBe("report-only");
  });

  it("applies a well-formed high-confidence official candidate", () => {
    const decision = evaluateFieldCandidate(base());
    expect(decision.action).toBe("apply");
    expect(isSafeToMerge(base())).toBe(true);
  });

  it("highlights a large date shift even when applying it", () => {
    const decision = evaluateFieldCandidate(
      base({ existingValue: "2026-05-01", proposedValue: "2026-06-15", dateShiftDays: 45 }),
    );
    expect(decision.action).toBe("apply");
    expect(decision.highlight).toBe(true);
  });

  it("labels a later date shift as a deadline extension", () => {
    const decision = evaluateFieldCandidate(
      base({ existingValue: "2026-05-01", proposedValue: "2026-05-10", dateShiftDays: 9 }),
    );
    expect(decision.action).toBe("apply");
    expect(decision.isExtension).toBe(true);
  });

  it("does not label a new (non-existing) date as an extension", () => {
    const decision = evaluateFieldCandidate(
      base({ existingValue: null, dateShiftDays: undefined }),
    );
    expect(decision.isExtension).toBeFalsy();
  });
});
