import { test, expect } from "@playwright/test";

// Real Firebase Auth + Firestore emulator round-trip (see
// playwright.emulator.config.ts / `npm run test:e2e:emulator`). Unlike the
// dialog-chrome-only specs in tests/e2e/firebase-enabled/, this proves the
// production bug is actually fixed: a paper saved without a `currentTarget`
// (previously serialized as a literal `undefined` field and rejected by
// Firestore with "Unsupported field value: undefined") must now reach the
// cloud and land in the "synced" state, not "Sync failed".

test("a paper saved without a target syncs to the cloud instead of failing", async ({ page }) => {
  const email = `sanitize-test-${Date.now()}@example.com`;
  const password = "correct horse battery staple";

  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Need an account? Create one" }).click();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // registerWithEmail() signs the user in immediately (verification is a
  // separate, non-blocking step) — see auth-modal.tsx.
  await expect(page.getByRole("dialog", { name: "Check your email" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto("/my-papers");
  await page.getByRole("button", { name: "Add paper" }).click();

  const editor = page.getByRole("dialog", { name: "Add paper" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Title").fill("A paper with no target yet");
  // Deliberately leave "Current target" blank — this is what used to
  // serialize `currentTarget: undefined` straight into the Firestore payload.
  await expect(editor.getByLabel("Current target")).toHaveValue("");
  await editor.getByRole("button", { name: "Save paper" }).click();

  await expect(
    page.getByText("Synced to your account — readable only by you, on any device you sign in on."),
  ).toBeVisible();
  await expect(page.getByText("Sync failed", { exact: false })).toHaveCount(0);
  await expect(page.getByText("A paper with no target yet")).toBeVisible();
});

test("a paper saved with a target but no slug also syncs successfully", async ({ page }) => {
  const email = `sanitize-test-slug-${Date.now()}@example.com`;
  const password = "correct horse battery staple";

  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Need an account? Create one" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("dialog", { name: "Check your email" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto("/my-papers");
  await page.getByRole("button", { name: "Add paper" }).click();
  const editor = page.getByRole("dialog", { name: "Add paper" });
  await expect(editor).toBeVisible();
  await editor.getByLabel("Title").fill("A paper with a free-text target");
  // A free-text target label with no matching conference/event slug — the
  // structured PaperTarget's `slug` stays undefined while `label` is set.
  await editor.getByLabel("Current target").fill("Some Workshop Nobody Catalogued");
  await editor.getByRole("button", { name: "Save paper" }).click();

  await expect(
    page.getByText("Synced to your account — readable only by you, on any device you sign in on."),
  ).toBeVisible();
  await expect(page.getByText("Sync failed", { exact: false })).toHaveCount(0);
});
