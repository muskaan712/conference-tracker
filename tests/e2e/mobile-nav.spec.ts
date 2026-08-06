import { test, expect } from "@playwright/test";

// "/" (home) is reachable via the logo link, not a NAV_LINKS entry, so it's
// intentionally excluded here — this list matches site-header.tsx's nav items.
const ROUTES = [
  "/conferences",
  "/events",
  "/timeline",
  "/tiers",
  "/regions",
  "/planner",
  "/my-papers",
  "/updates",
  "/methodology",
  "/about",
];

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12-ish

  test("desktop nav is hidden and a labelled, collapsed hamburger toggle is shown instead", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAttribute("aria-controls", /.+/);
  });

  test("opening the menu reveals every route and updates aria-expanded", async ({ page }) => {
    await page.goto("/");
    // The button's accessible name flips to "Close menu" once open, so match
    // both states with one locator rather than re-querying the old name.
    const toggle = page.getByRole("button", { name: /^(open|close) menu$/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    await expect(mobileNav).toBeVisible();
    for (const href of ROUTES) {
      await expect(mobileNav.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
  });

  test("no horizontal overflow at a narrow mobile width with the menu open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });

  test("closes the menu after navigating to a route", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Mobile" })
      .locator('a[href="/conferences"]')
      .click();
    await expect(page).toHaveURL(/\/conferences$/);
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("closes the menu on Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
  });

  test("closes the menu on an outside click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    // Click well below the menu panel, on the main page body.
    await page.locator("#main-content").click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
  });

  test("marks the current route as active in the mobile menu", async ({ page }) => {
    await page.goto("/conferences");
    await page.getByRole("button", { name: "Open menu" }).click();
    const activeLink = page
      .getByRole("navigation", { name: "Mobile" })
      .locator('a[aria-current="page"]');
    await expect(activeLink).toHaveAttribute("href", "/conferences");
  });
});

test.describe("desktop navigation", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows the full nav and hides the hamburger toggle", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
    for (const href of ROUTES) {
      await expect(
        page.getByRole("navigation", { name: "Primary" }).locator(`a[href="${href}"]`),
      ).toHaveCount(1);
    }
  });
});
