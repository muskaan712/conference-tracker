# AI Conference Tracker

A research-focused tracker for AI, machine learning, NLP, computer vision,
information retrieval, medical AI, and trustworthy AI conferences, with
verified deadlines, rankings, locations, workshops/tutorials/shared tasks
and other associated events, resubmission planning, and weekly update
checks. Built and maintained by Muskaan Chopra.

Accounts are entirely optional (Firebase Authentication + Firestore) and
only unlock cross-device sync for My Papers and saved resubmission plans —
browsing, filtering, the planner, calendar export, and guest My Papers all
work with zero account and zero Firebase configuration.

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
- [Associated events (workshops, tutorials, shared tasks, competitions)](#associated-events-workshops-tutorials-shared-tasks-competitions)
- [Visual design](#visual-design)
- [Accounts & privacy (Firebase, optional)](#accounts--privacy-firebase-optional)
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
npm run discover-events    # scan workshop/tutorial programme pages for associated-event candidates
npm run update-events      # merge new associated-event proposals into src/data/events
npm run check-sources      # ping every discovery source, write reports/source-health-*.md
                           # and update health status in discovery-sources.json
                           # (add -- --report-only to write only the report)
npm run test:rules         # Firestore Security Rules tests (requires the local emulator + Java)
```

No database or paid API is required for the public tracker — conference
and event data is plain JSON in `src/data/`, statically read at build time.
Firebase (optional) is the only external service, and only for accounts.

## Tech stack

- **Next.js 16** (App Router, Turbopack, TypeScript strict mode)
- **Tailwind CSS v4** + hand-built accessible components (no shadcn/ui
  dependency was needed once the design system settled — badges, cards,
  filters etc. all live in `src/components/`), on a blue/pink/yellow
  semantic colour-token system (see [Visual design](#visual-design))
- **Zod** for every schema: conference/event data, personal-paper import,
  Firestore records, env vars
- **date-fns** / **date-fns-tz** for all timezone and AoE handling
- **Firebase Authentication + Cloud Firestore** (optional, client SDK only)
  for cross-device account sync — see
  [Accounts & privacy](#accounts--privacy-firebase-optional)
- **Vitest** + **@testing-library/react** for unit tests;
  **@firebase/rules-unit-testing** for Firestore rules tests
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

## Associated events (workshops, tutorials, shared tasks, competitions)

Workshops, tutorials, shared tasks, competitions, challenges, demo tracks,
industry tracks, doctoral consortia, special sessions, hackathons, and
symposia are modelled as `CoLocatedEvent` (`src/lib/schema.ts`), stored in
`src/data/events/*.json`, one file per parent conference edition. Full
walkthrough (adding one by hand, lifecycle states, location inheritance,
proceedings, how discovery works and its current limits) is in
[`docs/EVENTS.md`](./docs/EVENTS.md). The short version:

- Every event's `parentConferenceSeriesId` + `parentConferenceEditionSlug`
  must resolve to a real, on-disk conference edition — `validate-data`
  fails the build on an orphaned event.
- An event's `ranking` is **always independent** of its parent conference's
  tier — defaults to `Unclassified` with no source, never copied from the
  parent, never inferred from publisher/indexing/reputation.
- `lifecycleStatus` distinguishes a parent conference merely _accepting
  proposals_ from a specific event actually being confirmed — see
  `UNCONFIRMED_EVENT_LIFECYCLE_STATUSES` — so a proposal is never displayed
  as a confirmed publication target.
- Location is inherited from the parent edition by default; an event-level
  `locationOverride` is used for online/hybrid/separately-hosted events, and
  the UI always labels which case applies.
- Routes: `/events` (filterable directory) and `/events/[slug]` (detail
  page). Every conference detail page also gets a "Workshops, tutorials and
  associated events" section, the `/timeline` page gets per-type toggle
  controls (main conference / workshops / tutorials / shared tasks /
  competitions & challenges / other), the resubmission planner has an
  "Include workshops and associated events" option with its own filters, and
  My Papers supports workshop/shared-task/competition/etc. paper targets.
- **No starter event data is seeded.** See
  [Known limitations](#known-limitations) and `MANUAL_VERIFICATION.md`.

## Visual design

The previous brown/beige/muted-orange palette has been replaced with a
blue (primary — structure, links, main-conference deadlines) / pink
(secondary — workshops and other associated events, expressive accents) /
yellow (highlight — approaching deadlines, warnings, shared tasks and
competitions) system, defined centrally as CSS custom properties in
`src/app/globals.css` (`--primary`/`--accent`, `--secondary`, `--highlight`,
plus `--background`/`--surface`/`--border`/`--muted-foreground`/
`--destructive`/`--focus-ring`, each with a light- and dark-mode value) and
consumed via Tailwind v4's `@theme inline` block — components reference
`bg-accent`, `text-secondary`, etc., never a raw hex value. Tier colours
(`TIER_COLORS` in `src/lib/tiers.ts`) and per-deadline-type colours
(`DEADLINE_TYPE_META` in `src/lib/badge-meta.tsx`) both follow the same
family (A\*/A → blue, B/workshops → pink, C/shared-tasks/competitions →
yellow, notification-family → indigo, camera-ready → fuchsia), always paired
with a text label and icon so colour is never the only signal. Every
solid-fill colour/foreground pairing used for real UI text was checked
against WCAG AA (≥ 4.5:1 for normal-size text) — see the comment block at
the top of `globals.css` for the specific figures.

## Accounts & privacy (Firebase, optional)

**Guest mode is the default and requires nothing.** My Papers and the
resubmission planner both display a small, permanent note explaining this:
selections/records stay in `localStorage` in that one browser, are never
sent anywhere, and are invisible to every other visitor. Refreshing the
page does not lose guest My Papers data (localStorage persists); the
planner's in-progress form values are just React state and reset on
refresh unless you explicitly save the plan.

**Signing in is entirely optional** and only unlocks cross-device sync for
My Papers and saved resubmission plans, via Firebase Authentication
(email/password + Google) and Cloud Firestore. Nothing about browsing,
filtering, the planner's calculations, or calendar export requires an
account. See [`docs/FIREBASE_SETUP.md`](./docs/FIREBASE_SETUP.md) for how
to create a Firebase project and wire up the six `NEXT_PUBLIC_FIREBASE_*`
env vars — until they're set (`NEXT_PUBLIC_FIREBASE_ENABLED=true` plus a
complete config), Firebase never initialises, sign-in controls simply don't
render (`src/lib/firebase/config.ts`), and the app is byte-for-byte the
guest-only experience.

Key points:

- **Data model**: `users/{uid}/papers/{id}`, `users/{uid}/resubmissionPlans/{id}`,
  `users/{uid}/favourites/{id}`, `users/{uid}/preferences/main` — chosen to
  minimise reads and let `firestore.rules` validate each record type
  independently. Every record carries `ownerUid` + `schemaVersion`.
- **Security rules** (`firestore.rules`, repo root): every read/write under
  `/users/{userId}/...` requires `request.auth.uid == userId`; ownership
  (`ownerUid`) can't be changed on update; `schemaVersion` is validated;
  every other path is default-deny. Tests: `tests/firestore/rules.test.ts`
  (`npm run test:rules`, requires the local Firestore emulator + a Java
  runtime — see [Testing](#testing) for whether this actually ran here).
- **Guest → cloud migration**: on sign-in, if both guest (localStorage) and
  cloud papers exist, a dialog (`src/components/auth/migration-dialog.tsx`)
  shows counts and offers Merge / use browser data only / use account data
  only / decide later — nothing uploads automatically, and merging resolves
  conflicts by `updatedAt` (`src/lib/firebase/migration.ts`, pure and
  unit-tested).
- **Sign-out** clears the in-memory Firestore session cache and returns to
  whatever's in guest `localStorage` — it does not delete cloud data.
- **Account settings** (gear/account menu in the header once signed in):
  change password, send a password-reset email, export all cloud data as
  JSON, delete all cloud data, delete the account entirely (deletes
  Firestore documents first, then the Auth account — see the caveat on
  `deleteAllUserData` in `src/lib/firebase/firestore-data.ts` about this
  being a client-side enumeration of this app's own known collections, not
  a generic recursive delete).
- **Cost-conscious by design**: targets the Firebase **Spark (free)**
  plan — no Cloud Functions, no Cloud Storage, no phone auth, no paid
  extensions, nothing that would auto-enable billing. Reads/writes are
  session-cached (`firestore-data.ts`) rather than re-fetched on every
  render.
- **What is not claimed**: Firebase has not been configured with real
  project credentials in this repository; authentication has not been
  tested against a live Firebase project; data is not end-to-end encrypted;
  no manuscript files are ever uploaded (only paper metadata).

## Ranking methodology

Tiers come from the [ICORE / CORE Conference Rankings Portal](https://portal.core.edu.au/conf-ranks/)
where a session lookup found one, cited via `ranking.source` +
`ranking.sourceUrl` + `ranking.verifiedAt`. Where no lookup was performed,
the tier is left `Unclassified` — that is **not** a quality judgement, just
an honest "not checked yet" marker. See `MANUAL_VERIFICATION.md` for which
of the 37 seeded series currently have a verified tier.

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
discover-events.ts       → scans enabled workshop/tutorial-programme
                            sources, classifies each linked event's type,
                            writes reports/discovered-events-<date>.json
update-events.ts         → resolves each candidate's parent edition (never
                            "whichever is newest" — see edition-matching.ts),
                            writes NEW event proposals (lifecycleStatus
                            "unverified", ranking Unclassified) into
                            src/data/events/*.json, writes
                            reports/event-update-report-<date>.md
validate-conference-data.ts → Zod-validates conferences AND events; checks
                               for orphaned events, duplicate ids/slugs,
                               ranking-without-source; exit 1 on failure
generate-update-report.ts   → Markdown report builder (used as a library
                               by update-conferences.ts / update-events.ts)
check-source-health.ts      → pings every source, always writes
                               reports/source-health-<date>.md, and records
                               isDead / last-checked / last-successful-scan
                               in discovery-sources.json unless run with
                               --report-only (which the weekly workflow
                               uses — see "Which timestamp means what")

shared/parse-helpers.ts      → dependency-free HTML/text helpers reused by
                                every adapter: meta/title/link extraction,
                                link classification, date-text parsing,
                                AoE/timezone-mention detection, table and
                                <dl> parsing, heading-bounded section
                                extraction
shared/merge-safeguards.ts   → evaluateFieldCandidate() — the single gate
                                every discovered field passes through before
                                being written: empty-value, official-value,
                                tentative-vs-official, workshop-vs-main-track,
                                ranking-needs-source, low-confidence-report-
                                only, conflicting-source, and large-date-
                                shift/extension-flagging rules, each with a
                                regression test in tests/unit/merge-
                                safeguards.test.ts
shared/edition-matching.ts   → matchEditionForCandidate() — explicit year >
                                slug > page metadata year > conference-date
                                year > registry-configured year; returns "no
                                match" rather than ever guessing "the newest
                                edition"
shared/event-discovery.ts    → classifies programme-page links into
                                CoLocatedEventType and resolves the parent
                                edition the same safe way
```

**Nothing is ever auto-promoted to `official` or `verified`.** Discovery
only ever writes `verificationStatus: "discovered"` — a human reviewing
the resulting PR is the only thing that can upgrade it. `weekly-conference-
update.yml` runs `update-conferences.ts` **and** `update-events.ts`,
validates the result, skips opening a PR if `git diff` on
`src/data/conferences src/data/events` is empty, and otherwise commits to a
branch named `automated/conference-update-YYYY-MM-DD` and opens **one
combined PR** (never two, never a second workflow) — main is never written
to directly. The PR body concatenates both Markdown reports; labels
`automated-update`, `conference-data`, `needs-verification` are attached if
they exist in the repo (see `MANUAL_VERIFICATION.md` — create them once).

### Which timestamp means what

Three different dates are easy to confuse. They are deliberately **not**
interchangeable, and nothing writes one from another:

| Concept                           | Where it lives                                                 | Written by                                                                        |
| --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Last successful scanner run       | GitHub Actions run metadata for `weekly-conference-update.yml` | GitHub, every time the workflow succeeds — scheduled or `workflow_dispatch`       |
| Last conference/event data change | `edition.lastScannedAt` / `event.lastScannedAt` in `src/data/` | `update-conferences.ts` / `update-events.ts`, persisted only via a merged data PR |
| Last human verification           | `edition.lastVerifiedAt` and per-date `verifiedAt`             | A human reviewing a PR. Never automation.                                         |

The homepage's **Last successful scan** tile reads the first of those, via
`src/lib/automation-status.ts` (public GitHub Actions API, no token needed,
cached for an hour, `GITHUB_TOKEN` optional and server-only). Using
`edition.lastScannedAt` for it would be wrong: the weekly workflow opens a PR
only when conference/event data actually changed, so a run that found nothing
new — the normal case — never persists a timestamp anywhere in the repository,
and the tile would silently show the date of the last _data change_ instead of
the last _scan_. `edition.lastScannedAt` stays as edition-level audit detail
and as the fallback shown when the GitHub API is unreachable or rate-limited;
the site renders fine either way, and never calls GitHub from the browser.

For the same reason `check-source-health.ts` runs with `--report-only` in CI:
its timestamps would either die with the ephemeral runner or ride unreviewed
into an unrelated data PR. The durable record of a health check is
`reports/source-health-<date>.md`, uploaded as a workflow artifact. **No
workflow ever opens a timestamp-only PR or pushes timestamps to `main`.**

The included `jsonLdEventAdapter` looks for schema.org `Event` JSON-LD on
official pages, and the new `importantDatesTableAdapter` parses a generic
HTML `<table>`/`<dl>` of label/date pairs — both are genuinely implemented
and unit-tested against fixtures, but **neither has been verified against
any specific live conference site's exact markup in this change**, and no
per-family (ACL/NeurIPS/ICML/...) adapter beyond these two generic ones was
written — see [Known limitations](#known-limitations). Event discovery
(`discover-events.ts`) implements steps 1-4 of the associated-event
discovery flow (scan programme page → extract links → classify type →
match parent edition) but does not yet follow an individual event's own
page to extract its own dates/CFP/proceedings (steps 5-9) — every generated
event proposal starts with empty `dates`, explicitly flagged for manual
completion.

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

- **Unit tests** (`npm test`): every pure function in `src/lib/` and
  `scripts/shared/` — tier ordering, region/continent classification,
  status derivation (including today/tomorrow/approaching/passed/tentative),
  AoE conversion, filtering/sorting for both conferences and events, planner
  assessments (main-conference and event), `.ics` generation (escaping, UTC
  times, unique UIDs, RFC 5545 line folding), diffing (conference and
  event), Zod schemas (conference and event), edition matching, merge
  safeguards, HTML/date parsing helpers, the personal-paper localStorage
  migration, the Firebase guest-to-cloud migration logic, and Firebase
  config resolution. **229 tests** as of this writing.
- **e2e tests** (`npm run test:e2e`): filter by tier, filter Europe vs.
  Outside Europe, open a conference detail page, run the resubmission
  planner (including the "include events" option and its sub-filters), the
  events directory and timeline event-type toggles, the guest My Papers
  and planner privacy notes, add + export a personal paper as JSON, and
  that sign-in controls don't render when Firebase is unconfigured.
  **12 tests** as of this writing. Playwright's `webServer` config builds
  and starts the app itself — no separate `npm run dev` needed.
- **Firestore rules tests** (`npm run test:rules`): 11 cases in
  `tests/firestore/rules.test.ts` covering unauthenticated denial,
  cross-user read/write denial, ownership-change rejection, schema-version
  validation, and default-deny on unknown paths. Requires the local
  Firestore emulator (and therefore a Java runtime) — see
  [Accounts & privacy](#accounts--privacy-firebase-optional) for whether
  this actually ran in this environment.

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

- **Sparse verified data.** Of 37 seeded series, 21 have session-verified
  dates and 11 have a session-verified tier; the rest are structurally
  complete but empty by design (see `MANUAL_VERIFICATION.md`) rather than
  filled with guesses. One series (SDM) has no dates at all after
  aggregators disagreed with each other and the official site returned
  HTTP 403 during verification — recording nothing was safer than a guess.
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
- **Associated-event data is a small starter set, not comprehensive.**
  `src/data/events/` now seeds 9 events across 3 parent editions (was
  empty) — see `docs/EVENTS.md` and `MANUAL_VERIFICATION.md` for exactly
  what's verified vs. confirmed-only-by-the-parent's-programme-page, and
  which event types (shared-task, tutorial, competition, demo track) still
  have no example.
- **Event field-level discovery isn't implemented yet.** `update-events.ts`
  only _proposes new events_ (name, type, parent, link) from a programme
  page; it doesn't yet scan an individual event's own site for its dates,
  CFP, or proceedings status.
- **Four discovery adapters exist**: the generic JSON-LD adapter; a generic
  HTML important-dates adapter supporting tables, definition lists, and
  plain bulleted lists; a discovery-only adapter for the AI Deadlines
  community YAML feed (`ai-deadlines-yaml`, matched to local series via
  `shared/series-aliases.ts`); and an OpenReview venue-group metadata
  adapter (`openreview-venue-group`). No per-conference-family
  (ACL/NeurIPS/ICML/ICLR/AAAI/IJCAI/CVPR/ICCV/ECCV) HTML-scraping adapter
  was written — the reusable parsing helpers (`shared/parse-helpers.ts`)
  are the foundation for adding them later, but none is claimed as done
  here.
- **Firestore rules tests could not be executed in this environment** — the
  Firestore emulator requires a local Java runtime, which wasn't available
  when this change was made. `tests/firestore/rules.test.ts` is written and
  intended to be run via `npm run test:rules` wherever Java + the Firebase
  CLI are available; see `docs/FIREBASE_SETUP.md`.
- **Firebase itself is unconfigured** — no real Firebase project credentials
  were supplied or tested in this change; `NEXT_PUBLIC_FIREBASE_ENABLED`
  defaults to off, and the app is guest-only until someone completes
  `docs/FIREBASE_SETUP.md`.

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

- Per-conference-family adapters beyond the generic ones (official RSS/Atom
  feeds where conferences publish them; reviewed, source-specific HTML
  parsers where they don't).
- A CCF Deadlines-style nested-YAML adapter alongside the existing flat-list
  `ai-deadlines-yaml` one, and more `discovery-sources.json` entries using
  the `openreview-venue-group` parser for other OpenReview-hosted venues.
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
