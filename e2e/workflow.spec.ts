import { test, expect } from "@playwright/test";
test("operator saves rollout, sees decision and audit", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ship with intention." }),
  ).toBeVisible();
  await page.getByLabel("Demo admin token").fill("local-test-token-123");
  await page.getByLabel("Rollout percentage").fill("100");
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(page.getByText("Configuration version 2")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate saved flag" }).click();
  await expect(page.locator(".decision strong")).toHaveText("Enabled");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Demo admin token").fill("");
  await page.screenshot({ path: "docs/preview.png", fullPage: true });
});
test("mobile layout stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Feature controls" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
