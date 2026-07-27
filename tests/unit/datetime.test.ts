import { describe, expect, it } from "vitest";
import { formatOriginal, relativeTimeTo, resolveDateInstant } from "@/lib/datetime";

describe("resolveDateInstant", () => {
  it("resolves a non-AoE date using its IANA timezone", () => {
    const instant = resolveDateInstant({
      startsAt: "2026-06-01T12:00:00",
      timezone: "Europe/Berlin",
    });
    // Berlin is UTC+2 in June (CEST) → 12:00 local = 10:00 UTC.
    expect(instant.toISOString()).toBe("2026-06-01T10:00:00.000Z");
  });

  it("resolves an AoE date to the correct UTC instant (UTC-12)", () => {
    const instant = resolveDateInstant({
      startsAt: "2026-06-01T00:00:00",
      timezone: "UTC",
      isAoE: true,
    });
    // AoE midnight on June 1 is UTC 12:00 on June 1 (UTC-12 offset).
    expect(instant.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });

  it("treats an AoE end-of-day deadline as ending 12 hours after UTC midnight", () => {
    // A deadline authored as "2026-08-01 23:59 AoE" effectively ends at 2026-08-02T11:59Z.
    const instant = resolveDateInstant({
      startsAt: "2026-08-01T23:59:00",
      timezone: "UTC",
      isAoE: true,
    });
    expect(instant.toISOString()).toBe("2026-08-02T11:59:00.000Z");
  });
});

describe("formatOriginal", () => {
  it("shows the exact authored calendar date for an AoE deadline, independent of host timezone", () => {
    // Regression test: this must render "28 July 2026" regardless of the
    // machine's TZ env var — a prior bug routed this through parseISO(), which
    // interprets naive datetime strings in the host's local timezone and could
    // silently shift the displayed date by a day.
    const result = formatOriginal({
      startsAt: "2026-07-28T00:00:00",
      timezone: "Etc/GMT+12",
      isAoE: true,
    });
    expect(result).toBe("28 July 2026 (Anywhere on Earth, UTC−12)");
  });
});

describe("relativeTimeTo", () => {
  const now = new Date("2026-07-27T10:00:00.000Z");

  it("labels a same-day deadline as today", () => {
    const target = new Date("2026-07-27T22:00:00.000Z");
    expect(relativeTimeTo(target, now).label).toBe("today");
  });

  it("labels the next calendar day as tomorrow", () => {
    const target = new Date("2026-07-28T09:00:00.000Z");
    expect(relativeTimeTo(target, now).label).toBe("tomorrow");
  });

  it("labels a deadline within 14 days as approaching", () => {
    const target = new Date("2026-08-05T09:00:00.000Z");
    const result = relativeTimeTo(target, now);
    expect(result.label).toBe("approaching");
    expect(result.daysRemaining).toBeGreaterThan(1);
    expect(result.daysRemaining).toBeLessThanOrEqual(14);
  });

  it("labels a far-future deadline as upcoming", () => {
    const target = new Date("2026-12-01T09:00:00.000Z");
    expect(relativeTimeTo(target, now).label).toBe("upcoming");
  });

  it("labels a past deadline as passed with negative days remaining", () => {
    const target = new Date("2026-01-01T09:00:00.000Z");
    const result = relativeTimeTo(target, now);
    expect(result.label).toBe("passed");
    expect(result.daysRemaining).toBeLessThan(0);
  });
});
