import { test, expect } from "@playwright/test";

// Regression coverage for a production bug: the sticky, backdrop-blurred
// SiteHeader created a containing block for the Dialog's `position: fixed`
// overlay, so opening "Sign in" from the header only showed the dialog's
// sticky title bar — the form body was clipped/rendered beneath the header.
// Fixed by having Dialog render via createPortal(..., document.body), which
// escapes the header's stacking/containing context entirely.

async function overlayInfo(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  const handle = await dialog.elementHandle();
  if (!handle) throw new Error("dialog element not found");
  return page.evaluate((panel) => {
    const overlay = panel.parentElement?.parentElement ?? null;
    const header = panel.closest("header");
    const overlayRect = overlay?.getBoundingClientRect();
    return {
      insideHeader: header !== null,
      overlayIsDirectBodyChild: overlay?.parentElement === document.body,
      overlayWidth: overlayRect?.width ?? 0,
      overlayHeight: overlayRect?.height ?? 0,
    };
  }, handle);
}

test("opening Sign in from the site header renders the dialog under document.body, not inside the header", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();

  const info = await overlayInfo(page);
  expect(info.insideHeader).toBe(false);
  expect(info.overlayIsDirectBodyChild).toBe(true);
});

test("the full sign-in form is visible on a normal desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  const info = await overlayInfo(page);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(info.overlayWidth).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(info.overlayHeight).toBeGreaterThanOrEqual(viewport!.height - 1);
});

test("the full sign-in form is visible and scrolls without clipping on a short mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();

  const info = await overlayInfo(page);
  expect(info.insideHeader).toBe(false);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(info.overlayWidth).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(info.overlayHeight).toBeGreaterThanOrEqual(viewport!.height - 1);

  // All key form controls must be reachable via the panel's own internal
  // scroll — none of them clipped or stuck behind the header.
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  const panelBox = await dialog.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.height).toBeLessThanOrEqual(480);
});

test("closing the portalled dialog restores focus to the header's Sign in trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign in" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Sign in" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
