import { test, expect } from "@playwright/test";

test("My Papers shows the guest-storage privacy note", async ({ page }) => {
  await page.goto("/my-papers");
  await expect(
    page.getByText("Guest records are stored only in this browser.", { exact: false }),
  ).toBeVisible();
});

test("the resubmission planner shows the private-selections note", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByText(/Your selections are processed only in this browser/i)).toBeVisible();
});

test("the resubmission planner exposes an 'include events' option with its own sub-filters", async ({
  page,
}) => {
  await page.goto("/planner");
  const includeEvents = page.getByLabel("Include workshops and associated events");
  await expect(includeEvents).toBeVisible();
  await includeEvents.check();
  await expect(page.getByText("Workshops only")).toBeVisible();
  await expect(page.getByText("Shared tasks only")).toBeVisible();
  await expect(page.getByText("Archival only")).toBeVisible();
});

test("sign-in controls do not render when Firebase is not configured (guest-only build)", async ({
  page,
}) => {
  await page.goto("/");
  // This e2e run's webServer only sets NEXT_PUBLIC_SITE_URL — no Firebase
  // env vars — so the app must be indistinguishable from a guest-only build:
  // no broken/visible "Sign in" control anywhere in the header.
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0);
});

test("guest mode remains fully functional: browsing, planner, and My Papers all work without an account, and guest data survives a reload", async ({
  page,
}) => {
  // Browsing works with no account.
  await page.goto("/conferences");
  await expect(page.getByRole("heading", { name: "Conferences" })).toBeVisible();

  // The resubmission planner works with no account.
  await page.goto("/planner");
  await expect(page.getByText(/Your selections are processed only in this browser/i)).toBeVisible();

  // Guest My Papers: add a paper, confirm the guest-storage note, reload,
  // and confirm the paper is still there (it lived in localStorage, not a
  // server the reload would have to re-fetch from).
  await page.goto("/my-papers");
  await expect(
    page.getByText("Guest records are stored only in this browser.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add paper" }).click();
  await page.getByLabel("Title").fill("Guest Mode Persistence Check");
  await page.getByRole("button", { name: "Save paper" }).click();
  await expect(page.getByText("Guest Mode Persistence Check")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Guest Mode Persistence Check")).toBeVisible();
});
