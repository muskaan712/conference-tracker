import { describe, expect, it } from "vitest";
import {
  classifyLink,
  detectAoE,
  extractLinks,
  extractMetaTags,
  extractTitle,
  extractYearFromText,
  findIndividualEventLinks,
  findSectionByHeading,
  looksLikeCfpSection,
  looksLikeImportantDatesSection,
  parseDateText,
  parseDefinitionLists,
  parseFirstTable,
  parseTimezoneMention,
  stripTags,
} from "../../scripts/shared/parse-helpers";

describe("stripTags", () => {
  it("removes tags and scripts, collapsing whitespace", () => {
    expect(stripTags("<div>Hello <b>world</b></div>\n<script>evil()</script>")).toBe("Hello world");
  });
});

describe("extractMetaTags / extractTitle", () => {
  it("extracts meta name/property/content pairs", () => {
    const html = `<meta name="description" content="A conference"><meta property="og:title" content="EXC 2026">`;
    const meta = extractMetaTags(html);
    expect(meta.description).toBe("A conference");
    expect(meta["og:title"]).toBe("EXC 2026");
  });

  it("extracts the page title", () => {
    expect(extractTitle("<title>EXC 2026 &amp; Friends</title>")).toBe("EXC 2026 & Friends");
  });
});

describe("extractLinks / classifyLink / findIndividualEventLinks", () => {
  const html = `
    <a href="/cfp">Call for Papers</a>
    <a href="/dates">Important Dates</a>
    <a href="/workshops/foo">Foo Workshop</a>
    <a href="/tutorials/bar">Bar Tutorial</a>
    <a href="#">skip me</a>
  `;

  it("resolves relative hrefs against a base URL and skips anchors", () => {
    const links = extractLinks(html, "https://example.org/conf/");
    expect(links.some((l) => l.href === "https://example.org/cfp")).toBe(true);
    expect(links.some((l) => l.href.includes("#"))).toBe(false);
  });

  it("classifies known link patterns", () => {
    expect(classifyLink({ href: "/cfp", text: "Call for Papers" })).toBe("cfp");
    expect(classifyLink({ href: "/dates", text: "Important Dates" })).toBe("important-dates");
    expect(classifyLink({ href: "/x", text: "Random link" })).toBe("other");
  });

  it("finds plausible individual-event links (workshops/tutorials)", () => {
    const links = extractLinks(html, "https://example.org/");
    const eventLinks = findIndividualEventLinks(links);
    expect(eventLinks.some((l) => l.text === "Foo Workshop")).toBe(true);
    expect(eventLinks.some((l) => l.text === "Bar Tutorial")).toBe(true);
    expect(eventLinks.some((l) => l.text === "Call for Papers")).toBe(false);
  });
});

describe("detectAoE / parseTimezoneMention", () => {
  it("detects AoE phrasing", () => {
    expect(detectAoE("Deadline: 1 May 2026, Anywhere on Earth")).toBe(true);
    expect(detectAoE("Deadline: 1 May 2026 (AoE)")).toBe(true);
    expect(detectAoE("Deadline: 1 May 2026 UTC-12")).toBe(true);
    expect(detectAoE("Deadline: 1 May 2026")).toBe(false);
  });

  it("extracts a known timezone abbreviation", () => {
    expect(parseTimezoneMention("11:59pm PST")).toBe("America/Los_Angeles");
    expect(parseTimezoneMention("11:59pm CEST")).toBe("Europe/Berlin");
  });

  it("does not extract a timezone from AoE text (handled separately via isAoE)", () => {
    expect(parseTimezoneMention("Anywhere on Earth")).toBeUndefined();
  });
});

describe("extractYearFromText", () => {
  it("finds a plausible 20xx year", () => {
    expect(extractYearFromText("EXC 2026 will be held in June")).toBe(2026);
  });
  it("returns undefined when no year is present", () => {
    expect(extractYearFromText("no year here")).toBeUndefined();
  });
});

describe("parseDateText", () => {
  it("parses 'Month Day, Year'", () => {
    expect(parseDateText("May 1, 2026")).toBe("2026-05-01");
  });
  it("parses ordinal suffixes", () => {
    expect(parseDateText("May 1st, 2026")).toBe("2026-05-01");
  });
  it("parses 'Day Month Year'", () => {
    expect(parseDateText("1 May 2026")).toBe("2026-05-01");
  });
  it("parses 'Month Day' with a fallback year", () => {
    expect(parseDateText("May 1", 2026)).toBe("2026-05-01");
  });
  it("parses an ISO-like date directly", () => {
    expect(parseDateText("2026-05-01")).toBe("2026-05-01");
  });
  it("returns undefined for unparseable text rather than guessing", () => {
    expect(parseDateText("sometime soon")).toBeUndefined();
  });
});

describe("parseDefinitionLists / parseFirstTable", () => {
  it("parses <dl> term/definition pairs", () => {
    const html =
      "<dl><dt>Abstract deadline</dt><dd>May 1, 2026</dd><dt>Notification</dt><dd>June 1, 2026</dd></dl>";
    const entries = parseDefinitionLists(html);
    expect(entries).toEqual([
      { term: "Abstract deadline", definition: "May 1, 2026" },
      { term: "Notification", definition: "June 1, 2026" },
    ]);
  });

  it("parses the first HTML table's rows", () => {
    const html =
      "<table><tr><th>Event</th><th>Date</th></tr><tr><td>Abstract deadline</td><td>May 1, 2026</td></tr></table>";
    const rows = parseFirstTable(html);
    expect(rows).toEqual([
      ["Event", "Date"],
      ["Abstract deadline", "May 1, 2026"],
    ]);
  });

  it("returns an empty array when there is no table", () => {
    expect(parseFirstTable("<p>no table here</p>")).toEqual([]);
  });
});

describe("findSectionByHeading / looksLike* heuristics", () => {
  it("extracts the HTML between a matching heading and the next same-or-higher-level heading", () => {
    const html = "<h2>Important Dates</h2><p>Abstract: May 1</p><h2>Venue</h2><p>Somewhere</p>";
    const section = findSectionByHeading(html, /important dates/i);
    expect(section).toContain("Abstract: May 1");
    expect(section).not.toContain("Somewhere");
  });

  it("returns undefined when no heading matches", () => {
    expect(findSectionByHeading("<h2>Venue</h2>", /important dates/i)).toBeUndefined();
  });

  it("classifies CFP-like and important-dates-like text", () => {
    expect(looksLikeCfpSection("Submit your paper before the deadline")).toBe(true);
    expect(looksLikeCfpSection("Venue: Somewhere")).toBe(false);
    expect(looksLikeImportantDatesSection("Notification: June 1")).toBe(true);
  });
});
