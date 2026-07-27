import { describe, expect, it } from "vitest";
import { LOCAL_DEV_SITE_URL, resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("prefers an explicit override over everything else", () => {
    expect(
      resolveSiteUrl({
        explicit: "https://tracker.example",
        vercelProductionUrl: "prod.vercel.app",
        vercelUrl: "deploy-123.vercel.app",
      }),
    ).toBe("https://tracker.example");
  });

  it("strips a trailing slash from an explicit override", () => {
    expect(resolveSiteUrl({ explicit: "https://tracker.example/" })).toBe(
      "https://tracker.example",
    );
  });

  it("falls back to Vercel's stable production URL when no override is set", () => {
    expect(
      resolveSiteUrl({
        vercelProductionUrl: "prod.vercel.app",
        vercelUrl: "deploy-123.vercel.app",
      }),
    ).toBe("https://prod.vercel.app");
  });

  it("adds https:// to Vercel's bare-host env vars", () => {
    expect(resolveSiteUrl({ vercelProductionUrl: "my-app.vercel.app" })).toBe(
      "https://my-app.vercel.app",
    );
  });

  it("preserves an already-prefixed Vercel host instead of double-prefixing", () => {
    expect(resolveSiteUrl({ vercelProductionUrl: "https://my-app.vercel.app" })).toBe(
      "https://my-app.vercel.app",
    );
  });

  it("falls back to the per-deployment URL when production URL is absent", () => {
    expect(resolveSiteUrl({ vercelUrl: "deploy-123.vercel.app" })).toBe(
      "https://deploy-123.vercel.app",
    );
  });

  it("falls back to localhost when nothing is set", () => {
    expect(resolveSiteUrl({})).toBe(LOCAL_DEV_SITE_URL);
  });

  it("falls back to localhost when values are empty/whitespace strings", () => {
    expect(resolveSiteUrl({ explicit: "  ", vercelProductionUrl: "", vercelUrl: undefined })).toBe(
      LOCAL_DEV_SITE_URL,
    );
  });

  it("never returns a string containing the literal 'undefined'", () => {
    const result = resolveSiteUrl({
      explicit: undefined,
      vercelProductionUrl: undefined,
      vercelUrl: undefined,
    });
    expect(result).not.toContain("undefined");
  });

  it("preserves an explicit http:// override rather than forcing https", () => {
    expect(resolveSiteUrl({ explicit: "http://localhost:4000" })).toBe("http://localhost:4000");
  });
});
