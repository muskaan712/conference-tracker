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
