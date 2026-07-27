# Launch checklist

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the detailed steps behind each
item below.

## Repository

- [ ] Correct repository root selected — this folder (contains `package.json`)
- [ ] No uncommitted accidental files (`git status` clean before pushing)
- [ ] No secrets committed (no `.env`/`.env.local`, no API keys)
- [ ] No local absolute paths in tracked files
- [ ] `.gitignore` reviewed
- [ ] `main` branch configured as the default/production branch

## Branding

- [ ] Owner name is Muskaan Chopra (`src/lib/site-config.ts`)
- [ ] Site title is AI Conference Tracker (`src/lib/site-config.ts`)
- [ ] Description is final (`src/lib/site-config.ts`)
- [ ] No public placeholders remain (no literal `[YOUR NAME]`, `[OPTIONAL URL]`, etc.)
- [ ] Optional links (GitHub, personal site, contact email) are hidden when unset — not shown as `#` or "coming soon"
- [ ] Favicon works (`/icon`, `favicon.ico`)
- [ ] Social preview works (`/opengraph-image`)

## Data

- [ ] `npm run validate-data` passes
- [ ] Official dates have source URLs
- [ ] Unverified dates are visibly labelled
- [ ] Previous-cycle dates are clearly distinguished from confirmed ones
- [ ] Rankings show source and edition where assigned
- [ ] Europe/Outside-Europe classifications look correct for a spot-check sample
- [ ] Remaining manual work is listed in [`MANUAL_VERIFICATION.md`](../MANUAL_VERIFICATION.md)

## GitHub Actions

- [ ] `ci.yml` passes on the initial push
- [ ] Weekly workflow supports `workflow_dispatch` (manual runs)
- [ ] Workflow permissions enabled (Settings → Actions → General → "Read and write permissions")
- [ ] Labels exist or are created/handled automatically by the workflow
- [ ] Weekly workflow was manually triggered at least once and reviewed
- [ ] Confirmed the automated PR does not merge or approve itself

## Vercel

- [ ] Hobby plan selected
- [ ] Root Directory set to `.`
- [ ] Initial deployment succeeds
- [ ] `NEXT_PUBLIC_SITE_URL` configured (Project → Settings → Environment Variables)
- [ ] Redeployed after setting the env var
- [ ] Preview deployments appear on pull requests
- [ ] `main` branch deploys to Production

## Functional smoke test

- [ ] Home page loads
- [ ] Conference directory loads and filters respond
- [ ] Conference detail pages load
- [ ] Timeline page works
- [ ] Tier sorting works (A* → A → B → C → Unclassified)
- [ ] Europe / Outside Europe filtering works
- [ ] Resubmission planner returns results
- [ ] Personal paper planner persists after a page reload
- [ ] JSON export/import (My Papers) works
- [ ] `.ics` calendar export downloads a valid file
- [ ] Dark mode toggle works
- [ ] Mobile layout works (filters drawer, cards stack)
- [ ] No errors in the browser console on the pages above
