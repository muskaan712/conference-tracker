import { expect, test } from "@playwright/test";

// Deliberately asserts labels and separation of concepts, never a specific
// date: the scan date comes from the live GitHub Actions API at build time
// (falling back to edition timestamps), so pinning a value here would be a
// flake, not a test.
test("the homepage separates the automated scan date from human verification", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Last successful scan")).toBeVisible();
  await expect(page.getByText("Last automated scan")).toHaveCount(0);
  await expect(page.getByText(/Tracker data last verified/)).toBeVisible();

  // Raw workflow event names must never reach users.
  await expect(page.getByText("workflow_dispatch")).toHaveCount(0);
});
