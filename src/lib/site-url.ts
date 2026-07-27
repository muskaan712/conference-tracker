import { env } from "./env";

/** Fallback used only when nothing else resolves — local development. */
export const LOCAL_DEV_SITE_URL = "http://localhost:3000";

function withProtocol(host: string): string {
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export interface SiteUrlSources {
  /** An explicit, user-set override (e.g. NEXT_PUBLIC_SITE_URL). Trusted as a full URL. */
  explicit?: string;
  /** Vercel's stable production-domain env var. A bare host, no protocol. */
  vercelProductionUrl?: string;
  /** Vercel's per-deployment env var (previews included). A bare host, no protocol. */
  vercelUrl?: string;
}

/**
 * Pure priority-chain resolver — kept separate from `getSiteUrl()` so the
 * logic is trivially unit-testable without mocking `process.env`.
 *
 * Priority: explicit override > Vercel's stable production URL > Vercel's
 * per-deployment URL > localhost (local dev). Vercel's own env vars are bare
 * hostnames with no protocol, so those get "https://" added; an explicit
 * override is trusted as already being a full URL. Trailing slashes are
 * always stripped so callers can safely do `${getSiteUrl()}/path`.
 */
export function resolveSiteUrl(sources: SiteUrlSources): string {
  const explicit = sources.explicit?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const productionUrl = sources.vercelProductionUrl?.trim();
  if (productionUrl) return stripTrailingSlash(withProtocol(productionUrl));

  const deploymentUrl = sources.vercelUrl?.trim();
  if (deploymentUrl) return stripTrailingSlash(withProtocol(deploymentUrl));

  return LOCAL_DEV_SITE_URL;
}

/**
 * The real entry point used throughout the app. `VERCEL_PROJECT_PRODUCTION_URL`
 * and `VERCEL_URL` are populated automatically by Vercel at build/runtime —
 * nothing needs to be configured for previews to get a correct absolute URL.
 * Setting `NEXT_PUBLIC_SITE_URL` is only required to pin a custom production
 * domain once one exists.
 */
export function getSiteUrl(): string {
  return resolveSiteUrl({
    explicit: env.NEXT_PUBLIC_SITE_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    vercelUrl: process.env.VERCEL_URL,
  });
}
