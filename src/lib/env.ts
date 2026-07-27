import { z } from "zod";

/**
 * `NEXT_PUBLIC_SITE_URL` is intentionally optional here (no default) — when
 * it's unset, `getSiteUrl()` in `site-url.ts` falls through to Vercel's own
 * `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` env vars, then finally to
 * localhost. If it IS set, it must be a well-formed URL — fail fast rather
 * than silently building a broken sitemap/canonical URL.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env = loadEnv();
