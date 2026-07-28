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
  it("shows the exact authored calendar date and time for an AoE deadline, independent of host timezone", () => {
    // Regression test: this must render "28 July 2026, 00:00" regardless of
    // the machine's TZ env var — a prior bug routed this through parseISO(),
    // which interprets naive datetime strings in the host's local timezone
    // and could silently shift the displayed date by a day.
    const result = formatOriginal({
      startsAt: "2026-07-28T00:00:00",
      timezone: "Etc/GMT+12",
      isAoE: true,
    });
    expect(result).toBe("28 July 2026, 00:00 (Anywhere on Earth, UTC−12)");
  });

  it("does not shift a 23:59 AoE deadline to the next day (regression: reprojecting via the resolved UTC instant crosses midnight)", () => {
    // AoE is UTC-12, so resolveDateInstant("2026-07-28T23:59", AoE) lands on
    // 2026-07-29T11:59Z — a naive "read the UTC calendar date back off the
    // instant" approach would wrongly display "29 July 2026" for a deadline
    // that was authored, and must display, as 28 July.
    const result = formatOriginal({
      startsAt: "2026-07-28T23:59:00",
      timezone: "Etc/GMT+12",
      isAoE: true,
    });
    expect(result).toBe("28 July 2026, 23:59 (Anywhere on Earth, UTC−12)");
  });

  it("formats a non-AoE date in its own IANA timezone with time and zone abbreviation", () => {
    const result = formatOriginal({
      startsAt: "2026-06-01T12:00:00",
      timezone: "Europe/Berlin",
    });
    expect(result).toBe("1 June 2026, 12:00 GMT+2");
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

  it("treats an instant a few hours in the future as not passed", () => {
    const target = new Date(now.getTime() + 3 * 3_600_000);
    const result = relativeTimeTo(target, now);
    expect(result.isPassed).toBe(false);
    expect(result.msRemaining).toBeGreaterThan(0);
  });

  it("treats an instant a few hours in the past as passed, even mid-day", () => {
    const target = new Date(now.getTime() - 3 * 3_600_000);
    const result = relativeTimeTo(target, now);
    expect(result.isPassed).toBe(true);
    expect(result.msRemaining).toBeLessThan(0);
  });

  // Regression: a deadline earlier the same UTC calendar day must be
  // "passed", not "today" — the exact instant is what matters, never the
  // UTC-calendar-day bucket (daysRemaining would read 0 for both).
  it("marks a deadline earlier today (same UTC calendar day) as passed, not today", () => {
    const sameDayNow = new Date("2026-07-27T23:00:00.000Z");
    const earlierToday = new Date("2026-07-27T01:00:00.000Z");
    const result = relativeTimeTo(earlierToday, sameDayNow);
    expect(result.isPassed).toBe(true);
    expect(result.label).toBe("passed");
    expect(result.daysRemaining).toBe(0); // calendar-day bucket is 0, but that's not "still upcoming"
  });

  it("marks a deadline later today (same UTC calendar day) as today, not passed", () => {
    const sameDayNow = new Date("2026-07-27T01:00:00.000Z");
    const laterToday = new Date("2026-07-27T23:00:00.000Z");
    const result = relativeTimeTo(laterToday, sameDayNow);
    expect(result.isPassed).toBe(false);
    expect(result.label).toBe("today");
  });

  // Regression: crossing 00:00 UTC must not itself flip pass/fail — only the
  // exact instant does.
  it("is unaffected by the 00:00 UTC boundary on its own", () => {
    const justBeforeMidnightUtc = new Date("2026-07-27T23:59:00.000Z");
    const target = new Date("2026-07-28T00:01:00.000Z"); // 2 minutes later, across the UTC day boundary
    const result = relativeTimeTo(target, justBeforeMidnightUtc);
    expect(result.isPassed).toBe(false);
    expect(result.msRemaining).toBe(2 * 60_000);
  });

  it("reports hoursRemaining precisely for sub-48h countdowns", () => {
    const target = new Date(now.getTime() + 90 * 60_000); // 1.5 hours out
    const result = relativeTimeTo(target, now);
    expect(result.hoursRemaining).toBeCloseTo(1.5, 5);
  });
});

describe("relativeTimeTo — AoE rollover against a non-UTC display timezone", () => {
  // A deadline authored as "28 July 2026, 23:59 AoE" resolves to
  // 2026-07-29T11:59:00Z (see resolveDateInstant). Europe/Berlin is a
  // display timezone only — it must never affect whether the deadline has
  // passed, since that's decided purely by the resolved UTC instant vs now.
  const aoeInstant = resolveDateInstant({
    startsAt: "2026-07-28T23:59:00",
    timezone: "Etc/GMT+12",
    isAoE: true,
  });

  it("is still upcoming a few minutes before the resolved AoE instant", () => {
    const now = new Date(aoeInstant.getTime() - 5 * 60_000);
    expect(relativeTimeTo(aoeInstant, now).isPassed).toBe(false);
  });

  it("has passed a few minutes after the resolved AoE instant", () => {
    const now = new Date(aoeInstant.getTime() + 5 * 60_000);
    expect(relativeTimeTo(aoeInstant, now).isPassed).toBe(true);
  });

  it("matches what Europe/Berlin locals would experience: still open into their next afternoon", () => {
    // 2026-07-29T11:59:00Z is 13:59 CEST (Berlin is UTC+2 in July) — the
    // deadline is genuinely still open deep into the *next* Berlin afternoon.
    const berlinNoonNextDay = new Date("2026-07-29T10:00:00.000Z"); // 12:00 CEST
    expect(relativeTimeTo(aoeInstant, berlinNoonNextDay).isPassed).toBe(false);
  });
});

describe("relativeTimeTo — DST-sensitive dates", () => {
  it("resolves a Europe/Berlin deadline correctly either side of the spring-forward transition", () => {
    // Europe/Berlin moves from CET (UTC+1) to CEST (UTC+2) on 2027-03-28.
    const beforeDst = resolveDateInstant({
      startsAt: "2027-03-27T23:59:00",
      timezone: "Europe/Berlin",
    });
    expect(beforeDst.toISOString()).toBe("2027-03-27T22:59:00.000Z"); // still CET (UTC+1)

    const afterDst = resolveDateInstant({
      startsAt: "2027-03-29T23:59:00",
      timezone: "Europe/Berlin",
    });
    expect(afterDst.toISOString()).toBe("2027-03-29T21:59:00.000Z"); // now CEST (UTC+2)
  });

  it("correctly orders passed/upcoming across a DST transition", () => {
    const deadline = resolveDateInstant({
      startsAt: "2027-03-29T23:59:00",
      timezone: "Europe/Berlin",
    });
    const justBefore = new Date(deadline.getTime() - 60_000);
    const justAfter = new Date(deadline.getTime() + 60_000);
    expect(relativeTimeTo(deadline, justBefore).isPassed).toBe(false);
    expect(relativeTimeTo(deadline, justAfter).isPassed).toBe(true);
  });
});
