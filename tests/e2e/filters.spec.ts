import { test, expect } from "@playwright/test";

test("filtering by tier narrows the directory and updates the URL", async ({ page }) => {
  await page.goto("/conferences");
  await expect(page.getByRole("heading", { name: "Conferences", level: 1 })).toBeVisible();

  const resultCount = page.getByText(/of \d+ conferences/);
  await expect(resultCount).toBeVisible();

  // Open the "A*" tier toggle inside the (desktop) filter sidebar.
  await page.getByRole("button", { name: "A*", exact: true }).first().click();

  await expect(page).toHaveURL(/tiers=A\*/);
  await expect(page.getByRole("button", { name: "Tier A* Remove filter Tier A*" })).toBeVisible();
});

test("filtering Europe vs Outside Europe changes results", async ({ page }) => {
  await page.goto("/conferences");

  await page.getByRole("button", { name: "Europe", exact: true }).first().click();
  await expect(page).toHaveURL(/geographicCategories=Europe/);
  const europeCount = await page.getByText(/of \d+ conferences/).textContent();

  // Switch to Outside Europe instead.
  await page.getByRole("button", { name: "Europe", exact: true }).first().click(); // untoggle
  await page.getByRole("button", { name: "Outside Europe", exact: true }).first().click();
  await expect(page).toHaveURL(/Outside/);
  const outsideCount = await page.getByText(/of \d+ conferences/).textContent();

  expect(outsideCount).not.toBe(europeCount);
});
