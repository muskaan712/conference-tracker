/**
 * Reusable, dependency-free HTML/text parsing helpers shared by every
 * discovery adapter. Deliberately regex-based (no DOM/cheerio dependency) to
 * match the existing jsonLdEventAdapter's approach in adapters.ts. Every
 * function here is pure and side-effect-free so it can be unit tested
 * against fixture strings without any network access.
 */

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Extracts <meta name="..."> and <meta property="..."> tags as a flat map. */
export function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const tagPattern = /<meta\s+[^>]*>/gi;
  for (const tagMatch of html.matchAll(tagPattern)) {
    const tag = tagMatch[0];
    const nameMatch = tag.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (nameMatch && contentMatch) {
      meta[nameMatch[1].toLowerCase()] = contentMatch[1];
    }
  }
  return meta;
}

export function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : undefined;
}

export interface ExtractedLink {
  href: string;
  text: string;
}

/** Extracts every <a href="..."> with its visible text, resolved against baseUrl when relative. */
export function extractLinks(html: string, baseUrl?: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const pattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const rawHref = match[1].trim();
    const text = stripTags(match[2]);
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) continue;
    let href = rawHref;
    if (baseUrl) {
      try {
        href = new URL(rawHref, baseUrl).toString();
      } catch {
        continue;
      }
    }
    links.push({ href, text });
  }
  return links;
}

export type LinkClassification =
  | "cfp"
  | "important-dates"
  | "workshop-programme"
  | "submission-system"
  | "individual-workshop"
  | "tutorial"
  | "shared-task"
  | "competition"
  | "other";

const CLASSIFICATION_KEYWORDS: Array<[LinkClassification, RegExp]> = [
  ["cfp", /call[\s-]?for[\s-]?(papers|proposals)|\bcfp\b/i],
  ["important-dates", /important\s*dates|key\s*dates|deadlines/i],
  ["submission-system", /openreview|softconf|cmt3?\.research|easychair|\bsubmit\b/i],
  ["workshop-programme", /workshops?(\s|$)|workshop\s*programme|workshop\s*program/i],
  ["tutorial", /tutorials?/i],
  ["shared-task", /shared[\s-]?task/i],
  ["competition", /competition|challenge/i],
];

/** Heuristically classifies a link by its href + visible text — never claims certainty beyond keyword matching. */
export function classifyLink(link: ExtractedLink): LinkClassification {
  const haystack = `${link.text} ${link.href}`;
  for (const [classification, pattern] of CLASSIFICATION_KEYWORDS) {
    if (pattern.test(haystack)) return classification;
  }
  return "other";
}

/** Filters extracted links down to ones plausibly naming an individual associated event. */
export function findIndividualEventLinks(links: ExtractedLink[]): ExtractedLink[] {
  return links.filter((l) => {
    const c = classifyLink(l);
    return (
      c === "tutorial" || c === "shared-task" || c === "competition" || /workshop/i.test(l.text)
    );
  });
}

/** Detects "Anywhere on Earth" / AoE / UTC-12 phrasing in free text. */
export function detectAoE(text: string): boolean {
  return /anywhere\s+on\s+earth|\baoe\b|utc\s*-?\s*12/i.test(text);
}

const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  UTC: "UTC",
  GMT: "UTC",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  EST: "America/New_York",
  EDT: "America/New_York",
  CET: "Europe/Berlin",
  CEST: "Europe/Berlin",
  BST: "Europe/London",
};

/** Best-effort extraction of a known timezone abbreviation from free text. Returns undefined rather than guessing. */
export function parseTimezoneMention(text: string): string | undefined {
  if (detectAoE(text)) return undefined; // AoE is handled separately via isAoE, not a timezone.
  const match = text.match(/\b(UTC|GMT|PST|PDT|EST|EDT|CET|CEST|BST)\b/);
  return match ? TIMEZONE_ABBREVIATIONS[match[1]] : undefined;
}

/** Extracts the first plausible 4-digit conference-edition year (2000-2099) mentioned in text. */
export function extractYearFromText(text: string): number | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Best-effort parse of a "Month Day, Year" / "Day Month Year" style date
 * mention into an ISO `YYYY-MM-DD` string. Returns undefined (never a guess)
 * when the text doesn't confidently match a known pattern — callers must
 * treat an undefined result as "needs a human to read the source page".
 */
export function parseDateText(text: string, fallbackYear?: number): string | undefined {
  const cleaned = text.replace(/(\d+)(st|nd|rd|th)/gi, "$1").trim();

  const monthDayYear = cleaned.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (monthDayYear) {
    const month = MONTHS.indexOf(monthDayYear[1].toLowerCase()) + 1;
    const day = Number(monthDayYear[2]);
    const year = Number(monthDayYear[3]);
    return isoDate(year, month, day);
  }

  const dayMonthYear = cleaned.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = MONTHS.indexOf(dayMonthYear[2].toLowerCase()) + 1;
    const year = Number(dayMonthYear[3]);
    return isoDate(year, month, day);
  }

  const monthDayNoYear = cleaned.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/i,
  );
  if (monthDayNoYear && fallbackYear) {
    const month = MONTHS.indexOf(monthDayNoYear[1].toLowerCase()) + 1;
    const day = Number(monthDayNoYear[2]);
    return isoDate(fallbackYear, month, day);
  }

  const isoLike = cleaned.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoLike) {
    return isoDate(Number(isoLike[1]), Number(isoLike[2]), Number(isoLike[3]));
  }

  return undefined;
}

function isoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface DefinitionListEntry {
  term: string;
  definition: string;
}

/** Parses every <dl><dt>term</dt><dd>definition</dd>...</dl> pair out of an HTML fragment. */
export function parseDefinitionLists(html: string): DefinitionListEntry[] {
  const entries: DefinitionListEntry[] = [];
  for (const dlMatch of html.matchAll(/<dl[^>]*>([\s\S]*?)<\/dl>/gi)) {
    const body = dlMatch[1];
    const terms = [...body.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/gi)].map((m) => stripTags(m[1]));
    const defs = [...body.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/gi)].map((m) => stripTags(m[1]));
    for (let i = 0; i < Math.min(terms.length, defs.length); i++) {
      entries.push({ term: terms[i], definition: defs[i] });
    }
  }
  return entries;
}

/** Parses the rows of the first <table> in an HTML fragment into arrays of trimmed cell text. */
export function parseFirstTable(html: string): string[][] {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const rows: string[][] = [];
  for (const rowMatch of tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripTags(m[1]),
    );
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * Extracts the HTML between a heading whose text matches `keywords` and the
 * next heading of the same or a higher level — a crude but dependency-free
 * way to isolate a "Call for Papers" or "Important Dates" section on a page
 * that doesn't expose structured data.
 */
export function findSectionByHeading(html: string, keywords: RegExp): string | undefined {
  const headingPattern = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [...html.matchAll(headingPattern)];
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const text = stripTags(heading[2]);
    if (!keywords.test(text)) continue;
    const level = Number(heading[1]);
    const start = (heading.index ?? 0) + heading[0].length;
    let end = html.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (Number(headings[j][1]) <= level) {
        end = headings[j].index ?? html.length;
        break;
      }
    }
    return html.slice(start, end);
  }
  return undefined;
}

/** True when the section text plausibly describes a CFP (mentions submission/paper/deadline). */
export function looksLikeCfpSection(text: string): boolean {
  return /submission|paper|deadline|call\s+for/i.test(text);
}

/** True when the section text plausibly describes an important-dates listing. */
export function looksLikeImportantDatesSection(text: string): boolean {
  return /deadline|notification|camera[\s-]?ready|abstract/i.test(text);
}
