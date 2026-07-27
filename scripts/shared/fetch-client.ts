/**
 * A conservative, polite HTTP client for the discovery/update scripts:
 * descriptive User-Agent, per-host rate limiting, timeouts with retry on
 * transient failures, robots.txt respect, and an in-run cache so a single
 * script invocation never fetches the same URL twice.
 *
 * This deliberately does NOT attempt to bypass any anti-bot protection —
 * if a site blocks us, we log it and move on to the next source.
 */

export const USER_AGENT =
  "AI-Conference-Tracker-Bot/1.0 (+https://github.com/; contact via repository issues; respects robots.txt)";

const REQUEST_TIMEOUT_MS = 15_000;
const MIN_DELAY_BETWEEN_REQUESTS_PER_HOST_MS = 2_000;
const MAX_RETRIES = 2;

interface CacheEntry {
  status: number;
  body: string;
  fetchedAt: string;
}

export class FetchClient {
  private cache = new Map<string, CacheEntry>();
  private lastRequestAtByHost = new Map<string, number>();
  private robotsCache = new Map<string, string[]>();

  async fetchText(url: string): Promise<CacheEntry | undefined> {
    if (this.cache.has(url)) return this.cache.get(url);

    const allowed = await this.isAllowedByRobots(url);
    if (!allowed) {
      console.warn(`[fetch-client] Skipping (disallowed by robots.txt): ${url}`);
      return undefined;
    }

    await this.rateLimit(url);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await sleep(500 * (attempt + 1));
          continue;
        }

        const body = await response.text();
        const entry: CacheEntry = {
          status: response.status,
          body,
          fetchedAt: new Date().toISOString(),
        };
        this.cache.set(url, entry);
        return entry;
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        console.warn(`[fetch-client] Failed to fetch ${url}: ${(error as Error).message}`);
        return undefined;
      }
    }
    return undefined;
  }

  private async rateLimit(url: string): Promise<void> {
    const host = safeHost(url);
    if (!host) return;
    const last = this.lastRequestAtByHost.get(host) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < MIN_DELAY_BETWEEN_REQUESTS_PER_HOST_MS) {
      await sleep(MIN_DELAY_BETWEEN_REQUESTS_PER_HOST_MS - elapsed);
    }
    this.lastRequestAtByHost.set(host, Date.now());
  }

  private async isAllowedByRobots(url: string): Promise<boolean> {
    const host = safeHost(url);
    if (!host) return true;
    let rules = this.robotsCache.get(host);
    if (!rules) {
      rules = await this.fetchRobotsDisallowRules(host, url);
      this.robotsCache.set(host, rules);
    }
    const path = safePath(url);
    return !rules.some((disallowed) => disallowed && path.startsWith(disallowed));
  }

  private async fetchRobotsDisallowRules(host: string, sampleUrl: string): Promise<string[]> {
    try {
      const robotsUrl = new URL("/robots.txt", sampleUrl).toString();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(robotsUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) return [];
      const text = await response.text();
      return parseDisallowRulesForAnyAgent(text);
    } catch {
      // If robots.txt can't be fetched, proceed conservatively (allow) rather than
      // blocking discovery entirely, but this is logged for visibility.
      console.warn(`[fetch-client] Could not fetch robots.txt for ${host}; proceeding cautiously.`);
      return [];
    }
  }
}

function parseDisallowRulesForAnyAgent(robotsTxt: string): string[] {
  const lines = robotsTxt.split(/\r?\n/);
  const disallowed: string[] = [];
  let inWildcardGroup = false;
  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inWildcardGroup = value === "*";
    } else if (key === "disallow" && inWildcardGroup && value) {
      disallowed.push(value);
    }
  }
  return disallowed;
}

function safeHost(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
