import { test, expect } from "@playwright/test";

test("the events directory route loads and lists the seeded associated events", async ({
  page,
}) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Workshops & associated events" })).toBeVisible();
  // 9 events are seeded across aaai-2027, emnlp-2026, and eacl-2027 — see
  // src/data/events/. This asserts the real count rather than the old
  // "nothing tracked yet" empty state.
  await expect(page.getByText("9 of 9 events")).toBeVisible();
  await expect(page.getByText("No associated events are tracked yet.")).toHaveCount(0);
  await expect(page.getByText("BlackboxNLP", { exact: false }).first()).toBeVisible();
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

test("toggling a per-event-type control filters seeded event dates out of the timeline", async ({
  page,
}) => {
  await page.goto("/timeline");
  // Include past dates so BlackboxNLP's already-passed deadline stays visible
  // regardless of exactly when this test runs.
  await page.getByLabel("Include past dates").check();
  // BlackboxNLP is a "workshop"-type event, governed by the "Workshops" toggle.
  const workshopsToggle = page.getByRole("button", { name: "Workshops" });
  await expect(page.getByText("BlackboxNLP", { exact: false }).first()).toBeVisible();
  await workshopsToggle.click();
  await expect(page.getByText("BlackboxNLP", { exact: false })).toHaveCount(0);
});

test("a conference detail page with seeded events renders the associated-events section", async ({
  page,
}) => {
  await page.goto("/conferences/aaai-2027");
  await expect(
    page.getByRole("heading", { name: "Workshops, tutorials and associated events" }),
  ).toBeVisible();
  await expect(page.getByText("EAAI-27", { exact: false }).first()).toBeVisible();
});

test("a conference detail page with no seeded events never renders an empty associated-events section", async ({
  page,
}) => {
  await page.goto("/conferences/aistats-2027");
  // AISTATS has no seeded associated events — AssociatedEventsSection must
  // return null entirely rather than showing an empty heading/section.
  await expect(
    page.getByRole("heading", { name: "Workshops, tutorials and associated events" }),
  ).toHaveCount(0);
});
