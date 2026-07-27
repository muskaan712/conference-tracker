import { test, expect } from "@playwright/test";

test("the events directory route loads and shows the expected empty state", async ({ page }) => {
  // No associated-event data is seeded in this repository (deliberately, to
  // avoid fabricating workshop names — see MANUAL_VERIFICATION.md), so this
  // verifies the route itself and its honest "nothing tracked yet" state.
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Workshops & associated events" })).toBeVisible();
  await expect(page.getByText("No associated events are tracked yet.")).toBeVisible();
});

test("the timeline page exposes per-event-type toggle controls", async ({ page }) => {
  await page.goto("/timeline");
  await expect(page.getByRole("heading", { name: "Timeline", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Main conference deadlines" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Workshops" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tutorials" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Shared tasks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Competitions & challenges" })).toBeVisible();
});

test("a conference detail page never renders an empty associated-events section", async ({
  page,
}) => {
  await page.goto("/conferences");
  const firstCard = page.locator('a[href^="/conferences/"]').first();
  await firstCard.click();
  // With zero seeded events, the "Workshops, tutorials and associated
  // events" heading must not render at all (AssociatedEventsSection returns
  // null rather than showing an empty section).
  await expect(
    page.getByRole("heading", { name: "Workshops, tutorials and associated events" }),
  ).toHaveCount(0);
});
