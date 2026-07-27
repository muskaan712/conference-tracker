# AI Conference Tracker

A research-focused tracker for AI, machine learning, NLP, computer vision,
information retrieval, medical AI, and trustworthy AI conferences, with
verified deadlines, rankings, locations, resubmission planning, and weekly
update checks. Built and maintained by Muskaan Chopra.

**Conference dates and deadlines can change.** Always confirm critical
information on the linked official conference website before submitting a
paper or making travel arrangements. See
[`MANUAL_VERIFICATION.md`](./MANUAL_VERIFICATION.md) for exactly what has
and hasn't been verified in the current seed dataset, and
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) /
[`docs/LAUNCH_CHECKLIST.md`](./docs/LAUNCH_CHECKLIST.md) for launch steps.

> Screenshots: _add a few PNGs under `docs/screenshots/` and link them here
> once you have a deployed instance to capture._

## Table of contents

- [Quick start](#quick-start)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Ranking methodology](#ranking-methodology)
- [Europe / Outside Europe classification](#europe--outside-europe-classification)
- [Verification states](#verification-states)
- [Adding data by hand](#adding-data-by-hand)
- [Weekly automation](#weekly-automation)
- [Running the updater locally](#running-the-updater-locally)
- [Required GitHub permissions & secrets](#required-github-permissions--secrets)
- [Testing](#testing)
- [Deploying to Vercel](#deploying-to-vercel)
- [Known limitations](#known-limitations)
- [Ethical scraping practices](#ethical-scraping-practices)
- [Future improvements](#future-improvements)
- [Assumptions made](#assumptions-made)

## Quick start

Requires **Node.js 20.9+** (this repo was built and tested on Node 22).

```bash
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SITE_URL
npm run dev                  # http://localhost:3000
```

Other commands:

```bash
npm run build          # production build (Turbopack)
npm start               # serve the production build
npm run lint             # ESLint
npm run type-check       # tsc --noEmit
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright e2e tests (builds + starts the app itself)
npm run format            # Prettier --write
npm run validate-data     # validate src/data/conferences/*.json + discovery-sources.json
npm run discover          # run discovery adapters, write reports/discovered-candidates-*.json
npm run update-conferences # discover + merge candidates into src/data + write a Markdown report
npm run check-sources      # ping every discovery source, update health status in-place
```

There's no database, no auth, and no paid APIs — conference data is
plain JSON in `src/data/`, statically read at build time.

## Tech stack

- **Next.js 16** (App Router, Turbopack, TypeScript strict mode)
- **Tailwind CSS v4** + hand-built accessible components (no shadcn/ui
  dependency was needed once the design system settled — badges, cards,
  filters etc. all live in `src/components/`)
- **Zod** for every schema: conference data, personal-paper import, env vars
- **date-fns** / **date-fns-tz** for all timezone and AoE handling
- **Vitest** + **@testing-library/react** for unit tests
- **Playwright** for a small set of critical e2e flows
- **tsx** to run the automation scripts directly from TypeScript

## Project structure

```
src/
  app/                    routes (App Router)
  components/             shared UI components
  data/
    conferences/*.json    one file per conference series (validated by Zod)
    discovery-sources.json  registry of automation sources
  lib/                    all pure, unit-tested logic (schemas, status
                           derivation, tiers, geo, datetime/AoE, filtering,
                           sorting, planner, .ics generation, diffing, ...)
scripts/                  discovery/update/validation/report CLIs (run via tsx)
  shared/                 fetch client, adapter interface, adapters
tests/
  unit/                   Vitest specs, one per src/lib module
  e2e/                    Playwright specs
.github/workflows/        ci.yml, weekly-conference-update.yml
```

## Data model

Every conference edition is a `ConferenceEdition` (see
`src/lib/schema.ts`), validated by Zod at build time via
`src/lib/conferences.ts`. Key points:

- **Statuses are never stored** — `deriveConferenceStatus()` in
  `src/lib/status.ts` computes one of 15 statuses (`Open`, `Opening Soon`,
  `Abstract/Paper Deadline Approaching`, `In Review`, `Author Response`,
  `Notification Soon`, `Closed`, `Camera Ready`, `Conference Upcoming`,
  `Conference Ongoing`, `Completed`, `Dates Not Announced`,
  `Tentative Dates`, `Reference Cycle Only`) purely from the `dates` array
  and the current time, in strict chronological order. See the function's
  comments for the exact phase-ordering logic.
- **Every date carries its own `verificationStatus`**
  (`official | verified | tentative | previous-cycle | discovered |
conflicting | unverified`) — never a single blanket status for the whole
  edition. See [Verification states](#verification-states).
- **Rankings are never invented.** `ranking.tier` defaults to
  `"Unclassified"`; it's only set to `A*/A/B/C` when `ranking.source` and
  ideally `ranking.sourceUrl` / `ranking.verifiedAt` are also recorded.
- **`referenceDates`** holds previous-cycle dates kept purely for
  orientation — the UI renders these in a visually separated "reference
  only" section on the conference detail page and they are excluded from
  status derivation.
- **`auditTrail`** on each edition accumulates `AuditEntry` records
  (field, previous/new value, source, confidence, review status) —
  this is what powers `/updates`.

## Ranking methodology

Tiers come from the [ICORE / CORE Conference Rankings Portal](https://portal.core.edu.au/conf-ranks/)
where a session lookup found one, cited via `ranking.source` +
`ranking.sourceUrl` + `ranking.verifiedAt`. Where no lookup was performed,
the tier is left `Unclassified` — that is **not** a quality judgement, just
an honest "not checked yet" marker. See `MANUAL_VERIFICATION.md` for which
of the 25 seeded series currently have a verified tier.

## Europe / Outside Europe classification

`deriveGeographicCategory()` in `src/lib/geo.ts` classifies each **edition**
(not series) by its _announced venue_ for that specific year — never the
organising society's home country, and never inherited from a previous
edition. Precedence: `Hybrid` > `Online` > country-based
`Europe`/`Outside Europe` > `Location not announced` (when no venue is on
file yet). The Europe/country/continent lookup table lives in
`COUNTRY_INFO` in the same file — extend it there if a new host country
shows up.

## Verification states

| State            | Meaning                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `official`       | Taken directly from the conference's own site/CFP                            |
| `verified`       | Cross-checked against an official source                                     |
| `tentative`      | Published but explicitly flagged as subject to change                        |
| `previous-cycle` | Carried from an earlier edition, reference-only, never rendered as confirmed |
| `discovered`     | Found by automation, not yet human-reviewed                                  |
| `conflicting`    | Two or more sources disagree                                                 |
| `unverified`     | On file but not checked against any source                                   |

## Adding data by hand

**A new conference series:** create `src/data/conferences/<seriesId>.json`
matching `conferenceSeriesFileSchema` (see any existing file for shape),
run `npm run validate-data`, then `npm run dev` to see it appear.

**A new edition of an existing series:** add another entry to that series's
`editions` array. Slugs must be globally unique (`validate-data` checks this).

**A new deadline:** append to that edition's `dates` array with a unique
`id`, one of the `DeadlineType` values from `src/lib/schema.ts`, and an
honest `verificationStatus`.

**A new ranking source:** set `ranking.source`, `ranking.sourceUrl`,
`ranking.verifiedAt` on the edition. If you're not confident in the source,
leave `tier: "Unclassified"` instead of guessing.

**A new discovery source:** add an entry to `src/data/discovery-sources.json`
matching `discoverySourceSchema`. Set `trustLevel: "official"` only for a
conference's own site; `"secondary"` or `"discovery-only"` for aggregators —
those can surface candidates but the code never lets them mark a date
`official`. If no adapter in `scripts/shared/adapters.ts` supports the
`parser` id you set, it silently falls back to logging "needs manual review"
rather than crashing — write a real adapter when you're ready.

**How to verify a source:** open it in a browser, cross-check the specific
date/location against a second independent source if possible, then set
`verificationStatus: "official"` (own site) or `"verified"` (cross-checked)
plus `sourceUrl` and `verifiedAt` (ISO date).

## Weekly automation

```
discover-conferences.ts  → runs each enabled source's adapter, writes
                            reports/discovered-candidates-<date>.json
                            (read-only, touches no conference data)
update-conferences.ts    → re-runs discovery, merges any new/changed dates
                            into src/data/conferences/*.json tagged
                            verificationStatus: "discovered", appends an
                            AuditEntry per change (reviewStatus: "pending"),
                            writes reports/update-report-<date>.md
validate-conference-data.ts → Zod-validates everything; exit 1 on failure
generate-update-report.ts   → Markdown report builder (used as a library
                               by update-conferences.ts)
check-source-health.ts      → pings every source, records isDead / last-
                               checked / last-successful-scan in place
```

**Nothing is ever auto-promoted to `official` or `verified`.** Discovery
only ever writes `verificationStatus: "discovered"` — a human reviewing
the resulting PR is the only thing that can upgrade it. `weekly-conference-
update.yml` runs `update-conferences.ts`, validates the result, skips
opening a PR if `git diff` on `src/data/conferences` is empty, and
otherwise commits to a branch named `automated/conference-update-YYYY-MM-DD`
and opens a PR — main is never written to directly. The PR body is the
generated Markdown report; labels `automated-update`, `conference-data`,
`needs-verification` are attached if they exist in the repo (see
`MANUAL_VERIFICATION.md` — create them once).

The included `jsonLdEventAdapter` looks for schema.org `Event` JSON-LD on
official pages — the structured, machine-readable format called for in the
brief, preferred over CSS-selector scraping. Most conference sites don't
actually publish this yet, so expect it to return few or zero candidates
until more adapters are written per-source; that's an honest limitation,
not a bug (see [Known limitations](#known-limitations)).

## Running the updater locally

```bash
npm run check-sources       # optional: refresh source health first
npm run update-conferences  # hits real conference websites — rate-limited,
                             # respects robots.txt, ~2s between requests per
                             # host, 15s timeout, 2 retries on 5xx
npm run validate-data
git diff src/data/conferences   # review before committing anything
```

This makes real HTTP requests to the sites listed in
`src/data/discovery-sources.json`. It sends a descriptive `User-Agent`,
checks `robots.txt` before every request, and never attempts to bypass any
anti-bot protection — if a site blocks it, the run logs a warning and moves
on to the next source.

## Required GitHub permissions & secrets

- Repo setting: **Settings → Actions → General → Workflow permissions** →
  "Read and write permissions" (the workflow's own `permissions:` block
  requests `contents: write` + `pull-requests: write`, but the repo-level
  toggle must allow it too).
- No secrets beyond the default `GITHUB_TOKEN` are required — there are no
  paid APIs in this project.
- Create the `automated-update`, `conference-data`, `needs-verification`
  labels once (`gh label create automated-update`, etc.) so the weekly
  workflow's label-attach step has something to attach.

## Testing

- **Unit tests** (`npm test`): every pure function in `src/lib/` — tier
  ordering, region/continent classification, status derivation (including
  today/tomorrow/approaching/passed/tentative), AoE conversion, filtering,
  sorting, planner assessments, `.ics` generation (escaping, UTC times,
  unique UIDs, RFC 5545 line folding), diffing, and Zod schemas. 108 tests
  as of this writing.
- **e2e tests** (`npm run test:e2e`): filter by tier, filter Europe vs.
  Outside Europe, open a conference detail page, run the resubmission
  planner, add + export a personal paper as JSON. Playwright's `webServer`
  config builds and starts the app itself — no separate `npm run dev` needed.

## Deploying to Vercel

Zero-config on the free Hobby plan: import the repo, Root Directory `.`,
deploy. `NEXT_PUBLIC_SITE_URL` is optional — `getSiteUrl()` in
`src/lib/site-url.ts` automatically falls back to Vercel's own
`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` env vars, so the very first
deploy already gets a correct canonical URL. Set `NEXT_PUBLIC_SITE_URL`
once you've pinned a custom production domain. No database, no serverless
functions beyond what Next.js itself needs, no additional build settings
required. Full step-by-step instructions: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Known limitations

- **Sparse verified data.** Of 25 seeded series, 9 have session-verified
  dates and 11 have a session-verified tier; the rest are structurally
  complete but empty by design (see `MANUAL_VERIFICATION.md`) rather than
  filled with guesses.
- **The JSON-LD adapter finds little today.** Most conference sites don't
  publish schema.org `Event` markup; a real deployment will need more
  source-specific adapters over time (RSS/Atom where available, or careful,
  reviewed HTML parsing as a last resort).
- **No cross-source conflict resolution UI.** `verificationStatus:
"conflicting"` is modeled and rendered, but nothing currently _generates_
  it automatically — a human (or a future adapter) has to set it.
- **Countdown freshness.** Pages are statically generated with a 6-hour
  `revalidate`; "days remaining" can be up to 6 hours stale between
  revalidations rather than ticking live client-side.
- **`/updates` starts empty.** The seed data's `auditTrail` arrays are
  empty by design — there's no fabricated update history. It fills in once
  the first automated PR is reviewed and merged.

## Ethical scraping practices

The fetch client (`scripts/shared/fetch-client.ts`) enforces: a descriptive,
identifying `User-Agent`; a `robots.txt` check (parsed for the `*`
user-agent group) before every request, skipping disallowed paths;
per-host rate limiting (2s minimum between requests to the same host);
request timeouts (15s) with limited retries only on 5xx/network errors;
an in-run cache so a single script invocation never re-fetches the same URL;
and it never attempts to bypass CAPTCHAs, Cloudflare challenges, or any
other anti-bot measure — a blocked source is logged and skipped, not worked
around.

## Future improvements

- Per-source adapters beyond generic JSON-LD (official RSS/Atom feeds where
  conferences publish them; reviewed, source-specific HTML parsers where
  they don't).
- A `core-rankings-search` adapter so ranking changes can also flow through
  the review pipeline instead of being entered by hand.
- Live client-side countdown refresh instead of relying solely on ISR revalidation.
- A conflict-resolution surface in the update report when two enabled
  sources disagree about the same field.
- i18n for a non-English-speaking audience.

## Assumptions made

- **Node 20.9+** per the Next.js 16 requirement; this environment had no
  system Node.js at all, so a project-local Node 22 was provisioned via
  conda rather than assuming a global install — see the conda env if you're
  continuing development on the same machine this was built on.
- **"Structurally complete but sparsely populated" was taken literally**:
  every one of the 25 requested series has a real record with a real
  description and research-area tags, but dates/location/ranking are only
  populated where a same-session verification actually happened.
- **AoE (Anywhere on Earth) is always UTC−12**, per the conventional
  academic-deadline meaning, and is never silently converted to a local
  time anywhere a date is displayed — only shown alongside its
  Europe/Berlin equivalent as a secondary reference.
- **Region is edition-scoped, not series-scoped** — the same acronym can
  legitimately appear as both "Europe" and "Outside Europe" across
  different years, and the code treats that as normal rather than an error.
- **A single primary displayed tier per edition** (the schema supports
  richer per-source ranking metadata via `ranking.notes`, but only one
  `tier` is surfaced in the UI, per the brief).
