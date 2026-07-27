import type { VerificationStatus } from "../../src/lib/schema";

export type SourceTrustLevel = "official" | "secondary" | "discovery-only";
export type MergeConfidence = "high" | "medium" | "low";

export interface FieldCandidateEvidence {
  fieldName: string;
  existingValue: string | null;
  proposedValue: string | null;
  sourceTrustLevel: SourceTrustLevel;
  confidence: MergeConfidence;
  /** Present for date fields; absent otherwise. */
  existingVerificationStatus?: VerificationStatus;
  proposedVerificationStatus?: VerificationStatus;
  /** True once the candidate's parent edition has been confirmed by edition-matching.ts. */
  editionMatched: boolean;
  /** True when the proposed value targets a workshop/associated-event date rather than the main conference. */
  isAssociatedEventField?: boolean;
  /** True when this candidate would overwrite a main-conference-track field from a workshop/track-specific source. */
  targetsMainTrackField?: boolean;
  /** True for `ranking.tier` (or an event's independent ranking) changes specifically. */
  isRankingChange?: boolean;
  /** True for `proceedings.status` changes specifically. */
  isProceedingsChange?: boolean;
  sourceUrl?: string;
  /** Days between the existing and proposed date, when both are date values — used for the "large change" flag. */
  dateShiftDays?: number;
  /** A second, independently-sourced candidate disagrees with this one. */
  hasConflictingSource?: boolean;
}

export type MergeAction = "apply" | "report-only" | "reject";

export interface MergeDecision {
  action: MergeAction;
  reason: string;
  /** Set when the change should be flagged prominently in the PR/report even if applied (e.g. a large date shift). */
  highlight?: boolean;
  /** Set when this specific change should be labelled a deadline extension rather than a plain update. */
  isExtension?: boolean;
}

const LARGE_DATE_SHIFT_THRESHOLD_DAYS = 21;

function reject(reason: string): MergeDecision {
  return { action: "reject", reason };
}

function reportOnly(reason: string, extra: Partial<MergeDecision> = {}): MergeDecision {
  return { action: "report-only", reason, ...extra };
}

function apply(reason: string, extra: Partial<MergeDecision> = {}): MergeDecision {
  return { action: "apply", reason, ...extra };
}

/**
 * The single gate every discovered field candidate must pass through before
 * scripts/update-conferences.ts is allowed to write it to disk (as a
 * "discovered"/pending-review value — never as "official"). Encodes every
 * safeguard listed in Part 3 "Merge safeguards". Pure and side-effect-free
 * so each rule has an independent regression test.
 */
export function evaluateFieldCandidate(candidate: FieldCandidateEvidence): MergeDecision {
  // Edition mismatches block merging outright — never guess which edition a
  // candidate belongs to.
  if (!candidate.editionMatched) {
    return reject(
      "Edition mismatch: candidate could not be matched to a confirmed conference edition.",
    );
  }

  // Empty scraped values cannot overwrite populated values.
  if (
    (candidate.proposedValue == null || candidate.proposedValue === "") &&
    candidate.existingValue
  ) {
    return reject("Empty scraped value cannot overwrite an existing populated value.");
  }

  // Previous-cycle dates cannot become current confirmed dates.
  if (
    candidate.proposedVerificationStatus === "previous-cycle" &&
    candidate.existingValue == null
  ) {
    return reject(
      "A previous-cycle reference date cannot be introduced as a current confirmed date.",
    );
  }

  // Official values are never silently downgraded, and secondary/
  // discovery-only sources can never overwrite an official value.
  if (candidate.existingVerificationStatus === "official") {
    if (candidate.sourceTrustLevel !== "official") {
      return reject("A secondary or discovery-only source cannot overwrite an official value.");
    }
    if (
      candidate.proposedVerificationStatus &&
      candidate.proposedVerificationStatus !== "official"
    ) {
      return reject(
        `An official value cannot be silently downgraded to "${candidate.proposedVerificationStatus}".`,
      );
    }
  }

  // Tentative values cannot replace official values (covered above via the
  // official-source check, but also guards the case where the *candidate's*
  // own verification status is tentative regardless of trust level).
  if (
    candidate.existingVerificationStatus === "official" &&
    candidate.proposedVerificationStatus === "tentative"
  ) {
    return reject("A tentative value cannot replace an official value.");
  }

  // Workshop/track-specific deadlines cannot overwrite main-track deadlines,
  // and vice versa is implied by keeping the two fully separate fields.
  if (candidate.targetsMainTrackField && candidate.isAssociatedEventField) {
    return reject(
      "A workshop/track-specific date cannot overwrite a main-track conference deadline.",
    );
  }

  // Ranking changes require both a source and a confirmed edition; workshop
  // rankings must never be derived from the parent conference's ranking (the
  // caller is responsible for never constructing such a candidate at all —
  // this is the last-line check).
  if (candidate.isRankingChange) {
    if (!candidate.sourceUrl) {
      return reject("A ranking change requires a cited source URL.");
    }
    if (candidate.sourceTrustLevel === "discovery-only") {
      return reportOnly("Ranking change from a discovery-only source needs manual verification.");
    }
  }

  // Proceedings status requires evidence (a source URL) before it can be applied.
  if (candidate.isProceedingsChange && !candidate.sourceUrl) {
    return reportOnly(
      "Proceedings status change has no cited evidence; report-only until sourced.",
    );
  }

  // Conflicting sources are marked conflicting rather than silently picking one.
  if (candidate.hasConflictingSource) {
    return reportOnly(
      "Multiple sources disagree on this value; marked conflicting for manual review.",
    );
  }

  // Low-confidence changes remain report-only regardless of anything else.
  if (candidate.confidence === "low") {
    return reportOnly("Low-confidence candidate; kept report-only pending manual review.");
  }

  // A large date shift is still applied (as "discovered", pending review) but
  // must be highlighted prominently rather than blending in with routine updates.
  const isLargeShift =
    candidate.dateShiftDays != null &&
    Math.abs(candidate.dateShiftDays) >= LARGE_DATE_SHIFT_THRESHOLD_DAYS;
  const isExtension =
    candidate.dateShiftDays != null &&
    candidate.dateShiftDays > 0 &&
    candidate.existingValue != null;

  return apply("Candidate passed all merge safeguards.", {
    highlight: isLargeShift,
    isExtension,
  });
}

/** Convenience wrapper: true only when the safeguards allow writing the value to disk. */
export function isSafeToMerge(candidate: FieldCandidateEvidence): boolean {
  return evaluateFieldCandidate(candidate).action === "apply";
}
