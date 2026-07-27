import { test, expect } from "@playwright/test";

test("resubmission planner returns results after submitting the form", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "Resubmission planner" })).toBeVisible();

  await page.getByLabel("Expected notification date").fill("2026-06-01");
  await page.getByLabel("Minimum preparation buffer (days)").fill("7");
  await page.getByRole("button", { name: "Find candidate venues" }).click();

  await expect(
    page.getByText("This planner is a scheduling aid only.", { exact: false }),
  ).toBeVisible();

  const emptyState = page.getByText("No matching venues found");
  const results = page
    .locator("ul li")
    .filter({ hasText: /Comfortable|Feasible|Tight|Unrealistic/ });
  await expect(emptyState.or(results.first())).toBeVisible();
});
