# Deployment

Practical, launch-focused notes. For architecture, data model, and general
project docs, see the root [`README.md`](../README.md).

## Free architecture

```text
GitHub repository
        ↓
GitHub Actions scans weekly
        ↓
Automated pull request
        ↓
Human verification and merge
        ↓
Vercel Hobby redeploys
```

- **GitHub** hosting (repo + Actions) is free for public and most personal
  private repos.
- **GitHub Actions**: the weekly workflow is a single lightweight job
  (install, a handful of HTTP requests, validate, maybe open a PR) — well
  within the free minutes included for personal accounts.
- **Vercel Hobby** is free for personal, non-commercial projects within its
  plan limits (bandwidth, build minutes, etc. — check Vercel's current
  published limits if traffic ever becomes meaningful).
- A free `*.vercel.app` address is sufficient to launch. A custom domain is
  optional and not required at any point in this guide.
- No paid subscription, database, or third-party API key is required.

This repository's application root **is** its intended GitHub repository
root — `package.json`, `src/`, `scripts/`, `.github/`, and this `docs/`
folder all already live at the top level. Nothing needs to move.

## GitHub setup

Git is already initialized in this folder, on branch `main`, with a remote
already configured:

```text
origin  https://github.com/muskaan712/conference-tracker.git
```

`origin/main` and local `main` are currently in sync (both at the initial
placeholder commit), so no pull/merge is needed — just commit and push the
full application:

```bash
git add -A
git commit -m "Add full AI Conference Tracker application"
git push origin main
```

(If the repository at that URL doesn't exist yet under your GitHub account,
create it first — an empty repo, no README/license/gitignore — then run the
same three commands above.)

## GitHub repository settings

Go to:

```text
Repository → Settings → Actions → General → Workflow permissions
```

Enable:

- **Read and write permissions**
- **Allow GitHub Actions to create and approve pull requests**

This project only ever uses that second toggle to let the bot **open** a
PR — nothing in the codebase approves or merges its own pull requests; a
human always does that manually.

## Vercel Hobby setup

1. Sign in to [vercel.com](https://vercel.com) using your GitHub account.
2. **Add New → Project**.
3. Import the `conference-tracker` repository.
4. Confirm you're on the free **Hobby** plan (default for personal accounts).
5. Framework preset: Next.js is auto-detected — leave it as-is.
6. **Root Directory**: `.` (this repo's root already contains `package.json`).
7. Leave the build command, output directory, and install command on their
   Next.js defaults — nothing custom is required.
8. Click **Deploy**.
9. Copy the generated `https://<something>.vercel.app` URL from the
   deployment summary.
10. Go to **Vercel → Project → Settings → Environment Variables** and add:
    - Name: `NEXT_PUBLIC_SITE_URL`
    - Value: the URL from step 9 (e.g. `https://conference-tracker.vercel.app`)
    - Environment: Production (and Preview, if you want previews to also
      report their own canonical URL — otherwise previews fall back to
      Vercel's automatic `VERCEL_URL`, which already works correctly without
      this variable).
11. Redeploy (**Deployments → ⋯ → Redeploy** on the latest one, or just push
    a new commit) so the new env var takes effect.

Note: the app works correctly on the very first deploy even before step 10
— `getSiteUrl()` automatically falls back to Vercel's own
`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` env vars, which Vercel sets
for every deployment without any configuration. Setting `NEXT_PUBLIC_SITE_URL`
just pins the canonical URL once you know the final domain.

## First workflow test

1. Open the repo on GitHub → **Actions**.
2. Select **Weekly conference data update** in the left sidebar.
3. Click **Run workflow** (uses `workflow_dispatch`) → **Run workflow**.
4. Watch the run; open the `conference-update-reports-<run-id>` artifact to
   read the generated discovery/update report.
5. Check whether a branch named `automated/conference-update-YYYY-MM-DD` was
   created (Actions logs will show it, or check **Branches** in the repo).
6. If one was, open the **Pull requests** tab and review the auto-opened PR.
7. For every changed field in the PR body, open its cited source URL and
   confirm the value against the official page yourself.
8. Confirm the `CI` workflow passes on that PR (checks tab).
9. Open the Vercel preview deployment linked on the PR and click through the
   changed conference page(s).
10. Merge only once you've verified the sources — **not** automatically.
11. After merging to `main`, confirm Vercel redeploys production
    automatically (Vercel → Deployments should show a new Production
    deployment within a minute or two of the merge).

## No-change behaviour

A successful run that finds nothing new or changed will **not** open a pull
request — the workflow logs "No candidate changes discovered this run;
skipping PR." and exits successfully. Treat that as the expected, healthy
outcome most weeks, not a failure.

## Troubleshooting

| Symptom                                                                        | Likely cause / fix                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel build fails immediately with "package.json not found"                   | Wrong Root Directory — set it to `.` in Project Settings → General.                                                                                                                                                                            |
| Metadata / OG tags show `localhost:3000` in production                         | `NEXT_PUBLIC_SITE_URL` isn't set yet — either set it (see above) or redeploy so Vercel's automatic `VERCEL_PROJECT_PRODUCTION_URL` takes over.                                                                                                 |
| Weekly workflow fails with a permissions error creating the branch/PR          | Enable "Read and write permissions" under Settings → Actions → General → Workflow permissions (see above).                                                                                                                                     |
| PR creation step fails entirely                                                | Check the run logs for the exact `gh` error — most often a permissions issue (previous row) rather than a code issue.                                                                                                                          |
| Labels don't appear on the PR                                                  | Non-fatal by design — the workflow tries to create/attach `automated-update`, `conference-data`, `needs-verification` but a warning (not a failure) is logged if that step can't complete. Add the labels manually to the PR if you want them. |
| No PR appears after a manual run                                               | Check the run logs for "No candidate changes discovered" — this is success, not an error. See [No-change behaviour](#no-change-behaviour).                                                                                                     |
| `validate-data` fails in CI or the weekly workflow                             | A conference JSON file or `discovery-sources.json` doesn't match its Zod schema — the log names the exact file and field; fix the data, don't bypass validation.                                                                               |
| A source's health check shows unreachable, or discovery logs a robots.txt skip | Expected, honest behaviour, not a bug — see the fetch client's ethical-scraping rules in the root README. Re-run `npm run check-sources` locally later, or disable that source in `discovery-sources.json` if it's permanently gone.           |
| A source request times out                                                     | The fetch client retries transient failures automatically; a persistent timeout usually means the source is slow or blocking automated traffic — check it manually before assuming it's broken.                                                |
| No Vercel preview appears on a PR                                              | Confirm the Vercel GitHub integration is connected to this repo (Vercel → Project → Settings → Git) — it should attach automatically once the project is imported.                                                                             |
| Production doesn't redeploy after merging a PR                                 | Confirm the PR was merged into `main` specifically (Vercel's Production environment tracks `main` by default) and that the Vercel Git integration is still connected.                                                                          |
