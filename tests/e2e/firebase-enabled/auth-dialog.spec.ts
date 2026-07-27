import { test, expect } from "@playwright/test";

// This project runs against a webServer with a well-formed but fake Firebase
// config (see playwright.config.ts), so the real "Sign in" control renders —
// but no spec here ever submits a real sign-in, only exercises dialog chrome.

test("opens the auth dialog as an accessible, labelled modal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
});

test("closes the auth dialog on Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("closes the auth dialog on backdrop click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  // Click far outside the panel, still inside the fixed overlay.
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
});

test("closes the auth dialog with the visible close button and restores focus to the trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign in" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the auth dialog stays fully usable and scrollable on a short mobile viewport", async ({
  page,
}) => {
  // A short viewport (landscape phone / a phone with a lot of browser chrome
  // showing) is exactly the case that used to clip the top of the auth card.
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();

  // The close button (part of the sticky header) must be reachable/visible
  // even though the form content below it may exceed the viewport height.
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

  // The panel must not be taller than the viewport — it should scroll
  // internally instead of overflowing off-screen.
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(480);

  // Switching to "Create account" adds more form content — the dialog must
  // still render without pushing the close button out of reach.
  await page.getByRole("button", { name: "Need an account? Create one" }).click();
  await expect(page.getByRole("dialog", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
});

test("body scroll is locked while the auth dialog is open", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog", { name: "Sign in" })).toBeVisible();
  const overflow = await page.evaluate(() => document.body.style.overflow);
  expect(overflow).toBe("hidden");
});
