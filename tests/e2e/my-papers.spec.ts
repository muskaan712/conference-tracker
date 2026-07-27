import { test, expect } from "@playwright/test";

test("adding a paper and exporting JSON triggers a download", async ({ page }) => {
  await page.goto("/my-papers");
  await expect(page.getByRole("heading", { name: "My papers" })).toBeVisible();

  await page.getByRole("button", { name: "Add paper" }).click();
  await page.getByLabel("Title").fill("Test Paper About Retrieval");
  await page.getByRole("button", { name: "Save paper" }).click();

  await expect(page.getByText("Test Paper About Retrieval")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("my-papers.json");
});
