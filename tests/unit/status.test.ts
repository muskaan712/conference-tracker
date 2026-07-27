import { describe, expect, it } from "vitest";
import { deriveConferenceStatus } from "@/lib/status";
import type { ConferenceDate, DeadlineType, VerificationStatus } from "@/lib/schema";

function date(
  type: DeadlineType,
  startsAt: string,
  verificationStatus: VerificationStatus = "official",
  extra: Partial<ConferenceDate> = {},
): ConferenceDate {
  return {
    id: `${type}-${startsAt}`,
    type,
    label: type,
    startsAt,
    timezone: "UTC",
    verificationStatus,
    ...extra,
  };
}

const NOW = new Date("2026-06-15T00:00:00.000Z");

describe("deriveConferenceStatus", () => {
  it("returns 'Dates Not Announced' when there are no dates", () => {
    expect(deriveConferenceStatus([], NOW)).toBe("Dates Not Announced");
  });

  it("returns 'Reference Cycle Only' when every date is previous-cycle", () => {
    const dates = [date("full-paper", "2025-01-01T00:00:00.000Z", "previous-cycle")];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Reference Cycle Only");
  });

  it("returns 'Open' when the submission deadline is far out but not extremely far", () => {
    const dates = [date("full-paper", "2026-07-15T00:00:00.000Z")]; // 30 days out
    expect(deriveConferenceStatus(dates, NOW)).toBe("Open");
  });

  it("returns 'Opening Soon' when the deadline is more than 60 days out", () => {
    const dates = [date("full-paper", "2026-10-01T00:00:00.000Z")]; // >60 days out
    expect(deriveConferenceStatus(dates, NOW)).toBe("Opening Soon");
  });

  it("returns 'Paper Deadline Approaching' within 14 days of the full-paper deadline", () => {
    const dates = [date("full-paper", "2026-06-20T00:00:00.000Z")]; // 5 days out
    expect(deriveConferenceStatus(dates, NOW)).toBe("Paper Deadline Approaching");
  });

  it("returns 'Abstract Deadline Approaching' when only the abstract deadline is imminent", () => {
    const dates = [
      date("abstract", "2026-06-18T00:00:00.000Z"),
      date("full-paper", "2026-08-01T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Abstract Deadline Approaching");
  });

  it("returns 'In Review' after the submission deadline but well before notification", () => {
    const dates = [
      date("full-paper", "2026-06-01T00:00:00.000Z"),
      date("notification", "2026-08-01T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("In Review");
  });

  it("returns 'Notification Soon' within a week of notification", () => {
    const dates = [
      date("full-paper", "2026-05-01T00:00:00.000Z"),
      date("notification", "2026-06-20T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Notification Soon");
  });

  it("returns 'Author Response' during the response window", () => {
    const dates = [
      date("full-paper", "2026-05-01T00:00:00.000Z"),
      date("author-response", "2026-06-10T00:00:00.000Z", "official", {
        endsAt: "2026-06-20T00:00:00.000Z",
      }),
      date("notification", "2026-07-01T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Author Response");
  });

  it("returns 'Camera Ready' after notification and before the camera-ready deadline", () => {
    const dates = [
      date("notification", "2026-06-01T00:00:00.000Z"),
      date("camera-ready", "2026-07-01T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Camera Ready");
  });

  it("returns 'Conference Upcoming' after camera-ready and before the conference starts", () => {
    const dates = [
      date("camera-ready", "2026-06-01T00:00:00.000Z"),
      date("conference-start", "2026-09-01T00:00:00.000Z"),
      date("conference-end", "2026-09-05T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Conference Upcoming");
  });

  it("returns 'Conference Ongoing' between start and end", () => {
    const dates = [
      date("conference-start", "2026-06-14T00:00:00.000Z"),
      date("conference-end", "2026-06-18T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Conference Ongoing");
  });

  it("returns 'Completed' after the conference ends", () => {
    const dates = [
      date("conference-start", "2026-01-01T00:00:00.000Z"),
      date("conference-end", "2026-01-05T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Completed");
  });

  it("returns 'Closed' when only a passed submission deadline exists with nothing after it", () => {
    const dates = [date("full-paper", "2026-06-01T00:00:00.000Z")];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Closed");
  });

  it("returns 'Tentative Dates' when the key upcoming date is marked tentative", () => {
    const dates = [date("full-paper", "2026-06-20T00:00:00.000Z", "tentative")];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Tentative Dates");
  });

  it("does not override 'Conference Ongoing' or 'Completed' even if tentative", () => {
    const ongoing = [
      date("conference-start", "2026-06-14T00:00:00.000Z", "tentative"),
      date("conference-end", "2026-06-18T00:00:00.000Z", "tentative"),
    ];
    expect(deriveConferenceStatus(ongoing, NOW)).toBe("Conference Ongoing");
  });

  it("returns 'In Review' rather than 'Conference Upcoming' when there is no camera-ready date on file", () => {
    // Regression test: a conference with a far-future notification and conference
    // date, but no camera-ready milestone recorded, must not skip straight to
    // "Conference Upcoming" just because there's nothing gating that branch.
    const dates = [
      date("full-paper", "2026-05-06T00:00:00.000Z"),
      date("notification", "2026-09-24T00:00:00.000Z"),
      date("conference-start", "2026-12-06T00:00:00.000Z"),
      date("conference-end", "2026-12-12T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("In Review");
  });

  it("ignores previous-cycle dates when other active dates exist", () => {
    const dates = [
      date("full-paper", "2025-01-01T00:00:00.000Z", "previous-cycle"),
      date("full-paper", "2026-06-20T00:00:00.000Z"),
    ];
    expect(deriveConferenceStatus(dates, NOW)).toBe("Paper Deadline Approaching");
  });
});
