# Workshops, tutorials & associated events

How this codebase models workshops, tutorials, shared tasks, competitions, and
other events co-located with a specific conference edition.

## Why this exists

A parent conference's tier, reputation, or publisher tells you nothing about
whether a specific workshop is well-run, competitive, or archival. Treating
"NeurIPS is A*" as evidence that "the XYZ Workshop at NeurIPS is A*" would be a
fabrication. This tracker keeps the two fully separate:

- The **parent conference edition** (`src/data/conferences/*.json`) keeps its
  own `ranking`.
- Each **associated event** (`src/data/events/*.json`) has its own
  independent `ranking`, which defaults to `{ "tier": "Unclassified" }` with
  no `source` until a real, independent ranking source is found for that
  specific event. Nothing in the codebase copies one into the other — see
  `coLocatedEventSchema` in [`src/lib/schema.ts`](../src/lib/schema.ts) and
  the orphan/ranking checks in
  [`scripts/validate-conference-data.ts`](../scripts/validate-conference-data.ts).

## Adding a workshop by hand

1. Confirm the event's parent conference **edition** already exists in
   `src/data/conferences/*.json` — every event must reference a real
   `parentConferenceEditionSlug`; `npm run validate-data` fails the build for
   an orphaned event.
2. Create or open `src/data/events/<parent-edition-slug>.json`:

   ```json
   {
     "parentConferenceEditionSlug": "emnlp-2026",
     "events": [
       {
         "id": "emnlp-2026-blackboxnlp",
         "slug": "emnlp-2026-blackboxnlp",
         "name": "BlackboxNLP: Analyzing and Interpreting Neural Networks for NLP",
         "acronym": "BlackboxNLP",
         "type": "workshop",
         "parentConferenceSeriesId": "emnlp",
         "parentConferenceEditionSlug": "emnlp-2026",
         "editionYear": 2026,
         "lifecycleStatus": "unverified",
         "researchAreas": ["nlp", "responsible-ai"],
         "dates": [],
         "paperTypes": [],
         "tracks": [],
         "ranking": { "tier": "Unclassified" },
         "verificationStatus": "unverified",
         "sourceUrls": [],
         "auditTrail": []
       }
     ]
   }
   ```

3. Only fill in `dates`, `officialWebsiteUrl`, `proceedings`, etc. once
   you've confirmed them on the event's own official page — never copy a
   previous year's workshop list or infer dates from the parent conference.
   Leave a field empty (and `verificationStatus: "unverified"`) rather than
   guess.
4. Run `npm run validate-data` — it validates event files the same way it
   validates conference files (unique ids/slugs, valid parent edition,
   no ranking without a source, valid date ordering).

## Lifecycle status

`lifecycleStatus` exists specifically to stop a parent conference's "call for
workshop proposals" from being displayed as though a specific workshop were
confirmed. Use the most conservative state that's actually true:

| State                                                                        | Means                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `proposed`                                                                   | Someone submitted a proposal; not yet accepted                                        |
| `proposal-call-open`                                                         | The **parent conference** is accepting proposals — no specific workshop confirmed yet |
| `accepted`                                                                   | The parent conference accepted the proposal                                           |
| `officially-announced`                                                       | The event has its own official listing                                                |
| `cfp-open`                                                                   | The event's own call for papers is open                                               |
| `submission-closed` / `in-review` / `notification-released` / `camera-ready` | Its own submission pipeline stage                                                     |
| `scheduled`                                                                  | Programme/schedule published                                                          |
| `completed`                                                                  | Already happened                                                                      |
| `cancelled` / `not-returning`                                                | Explicitly not happening this cycle                                                   |
| `unverified`                                                                 | Default — not yet confirmed either way                                                |

`UNCONFIRMED_EVENT_LIFECYCLE_STATUSES` in `src/lib/schema.ts` lists the states
(`proposed`, `proposal-call-open`) the UI must never present as a confirmed
publication target.

## Location inheritance

By default an event's location is **inherited** from its parent edition —
`resolveEventLocation()` in [`src/lib/events.ts`](../src/lib/events.ts) reads
the parent edition's city/country/venue/online-hybrid flags unless the event
sets its own `locationOverride`. The UI (`EventDetail`, `EventCard`) always
labels which case applies.

## Proceedings

`proceedings.status` is one of `archival`, `non-archival`,
`separate-proceedings`, `parent-conference-proceedings`, `no-proceedings`, or
`unknown` (the default when nothing has been confirmed). The automated
merge safeguards (see below) refuse to write a proceedings-status change
without a cited source URL.

## How automated discovery works (and its current limits)

`scripts/discover-events.ts` / `scripts/update-events.ts` implement steps 1-4
of the discovery flow: scan an enabled `workshop-programme` /
`tutorial-programme` discovery source, extract links, classify each by type
(`scripts/shared/event-discovery.ts`), and match the parent edition via
`scripts/shared/edition-matching.ts` (explicit year → registry-configured
year → page-derived year; **never** "whichever edition is newest"). A
successful match produces a **new** event proposal only — `lifecycleStatus:
"unverified"`, `ranking: { tier: "Unclassified" }`, an audit-trail entry, and
`reviewStatus: "pending"`.

**Known limitation:** this pass does not yet follow an individual workshop's
own website to extract its own CFP/dates/proceedings (steps 5-9 of the flow
in the spec) — that per-event field-level scan is a follow-up. Every
generated event proposal therefore starts with empty `dates` and is
explicitly flagged for a human to fill in from the event's own official page.

Merge safeguards (`scripts/shared/merge-safeguards.ts`) gate every field
candidate before anything is written — see the automation section of the
root [README.md](../README.md) for the full list and their regression tests.

## Starter data

No associated events are seeded in this repository yet. Populating even a
"small representative set" honestly requires visiting each event's current
official page and confirming its name, type, and status — that verification
pass was intentionally **not** performed in this change, to avoid inventing
plausible-sounding workshop names or dates. See `MANUAL_VERIFICATION.md` for
this as a tracked gap.
