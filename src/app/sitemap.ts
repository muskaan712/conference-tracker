import type { MetadataRoute } from "next";
import { getAllEditions } from "@/lib/conferences";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_ROUTES = [
  "",
  "/conferences",
  "/timeline",
  "/tiers",
  "/regions",
  "/planner",
  "/my-papers",
  "/updates",
  "/methodology",
  "/about",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: "daily",
    priority: route === "" ? 1 : 0.7,
  }));
  const conferenceEntries: MetadataRoute.Sitemap = getAllEditions().map((edition) => ({
    url: `${base}/conferences/${edition.slug}`,
    lastModified: edition.lastVerifiedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  return [...staticEntries, ...conferenceEntries];
}
