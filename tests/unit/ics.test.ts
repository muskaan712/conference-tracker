import { describe, expect, it } from "vitest";
import {
  buildIcsCalendar,
  buildIcsEvent,
  escapeIcsText,
  formatIcsDateUtc,
  icsForConference,
  icsForDeadline,
  icsUid,
} from "@/lib/ics";
import { makeDate, makeEdition } from "./fixtures";

/** Reverses RFC 5545 line folding (CRLF + space) so assertions can match un-split text. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("escapeIcsText", () => {
  it("escapes commas, semicolons, and backslashes", () => {
    expect(escapeIcsText("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
  });
  it("escapes newlines", () => {
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });
});

describe("formatIcsDateUtc", () => {
  it("formats a Date as UTC basic ICS format", () => {
    const d = new Date("2026-05-06T00:00:00.000Z");
    expect(formatIcsDateUtc(d)).toBe("20260506T000000Z");
  });
});

describe("icsUid", () => {
  it("produces a stable, unique-looking id per seed", () => {
    expect(icsUid("acl-2027-full-paper")).toBe("acl-2027-full-paper@ai-conference-tracker");
    expect(icsUid("a")).not.toBe(icsUid("b"));
  });
});

describe("buildIcsEvent / buildIcsCalendar", () => {
  it("produces a valid VEVENT with required fields", () => {
    const event = buildIcsEvent({
      uidSeed: "test-event",
      summary: "Test Summary",
      description: "Test description",
      start: new Date("2026-05-06T00:00:00.000Z"),
      now: new Date("2026-05-01T00:00:00.000Z"),
    });
    expect(event).toContain("BEGIN:VEVENT");
    expect(event).toContain("END:VEVENT");
    expect(event).toContain("UID:test-event@ai-conference-tracker");
    expect(event).toContain("DTSTART:20260506T000000Z");
    expect(event).toContain("SUMMARY:Test Summary");
  });

  it("wraps events in a valid VCALENDAR", () => {
    const event = buildIcsEvent({
      uidSeed: "x",
      summary: "X",
      description: "Y",
      start: new Date("2026-01-01T00:00:00.000Z"),
    });
    const cal = buildIcsCalendar([event], "My Calendar");
    expect(cal).toContain("BEGIN:VCALENDAR");
    expect(cal).toContain("VERSION:2.0");
    expect(cal).toContain("END:VCALENDAR");
    expect(cal).toContain("X-WR-CALNAME:My Calendar");
  });
});

describe("icsForDeadline", () => {
  const edition = makeEdition({ officialWebsiteUrl: "https://example.org" });
  const d = makeDate("full-paper", "2026-05-06T00:00:00.000Z", {
    verificationStatus: "unverified",
    sourceUrl: "https://example.org/cfp",
  });

  it("includes a verification warning for non-official/verified dates", () => {
    const ics = icsForDeadline(edition, d);
    expect(ics).toContain("Warning:");
    expect(ics).toContain("unverified");
  });

  it("does not include a warning for official dates", () => {
    const officialDate = makeDate("full-paper", "2026-05-06T00:00:00.000Z", {
      verificationStatus: "official",
    });
    const ics = icsForDeadline(edition, officialDate);
    expect(ics).not.toContain("Warning:");
  });

  it("includes the conference name and official website", () => {
    const ics = icsForDeadline(edition, d);
    expect(ics).toContain(edition.name);
    expect(ics).toContain("example.org");
  });

  it("notes AoE timezone distinctly from IANA timezones", () => {
    const aoeDate = makeDate("full-paper", "2026-05-06T00:00:00.000Z", {
      isAoE: true,
      timezone: "Etc/GMT+12",
    });
    const ics = icsForDeadline(edition, aoeDate);
    expect(unfold(ics)).toContain("Anywhere on Earth");
  });
});

describe("icsForConference", () => {
  it("produces one VEVENT per date", () => {
    const edition = makeEdition({
      dates: [
        makeDate("abstract", "2026-05-01T00:00:00.000Z"),
        makeDate("full-paper", "2026-05-06T00:00:00.000Z"),
      ],
    });
    const ics = icsForConference(edition);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
  });
});
