/**
 * Single source of truth for public site branding and contact info.
 * Optional fields are `undefined` (not empty strings or placeholders) until
 * a real value exists — UI that renders them must check truthiness and hide
 * the element entirely rather than render a dead link or "coming soon".
 */
export type SiteConfig = {
  ownerName: string;
  title: string;
  shortTitle: string;
  description: string;
  defaultTimezone: string;
  githubUrl?: string;
  personalWebsiteUrl?: string;
  contactEmail?: string;
};

export const siteConfig: SiteConfig = {
  ownerName: "Muskaan Chopra",
  title: "AI Conference Tracker",
  shortTitle: "Conference Tracker",
  description:
    "A research-focused tracker for AI, machine learning, NLP, computer vision, information retrieval, medical AI, and trustworthy AI conferences, with verified deadlines, rankings, locations, resubmission planning, and weekly update checks.",
  defaultTimezone: "Europe/Berlin",
  // githubUrl, personalWebsiteUrl, contactEmail: add these once real values
  // exist. Leave them unset rather than filling in a placeholder — every
  // call site checks truthiness and hides the corresponding UI element.
};
