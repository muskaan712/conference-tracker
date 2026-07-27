import { test, expect } from "@playwright/test";

test("opening a conference detail page shows dates and verification info", async ({ page }) => {
  await page.goto("/conferences");

  const firstCard = page.locator('a[href^="/conferences/"]').first();
  const href = await firstCard.getAttribute("href");
  await firstCard.click();

  await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dates" })).toBeVisible();
});
