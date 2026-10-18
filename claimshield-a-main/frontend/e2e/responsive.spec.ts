import { expect, test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCREENS = resolve(dirname(fileURLToPath(import.meta.url)), "../../demo-kit/screens");

test.use({ viewport: { width: 390, height: 844 } });

test("mobile: drawer navigation and a readable results screen", async ({ page }) => {
  await page.goto("/#/audit/new");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "New audit" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: /Sunrise Multispeciality/ }).click();
  await page.getByRole("button", { name: /Run claim audit/ }).click();
  await expect(page.getByText(/5 items worth disputing/)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (process.env.SCREENSHOTS) await page.screenshot({ path: resolve(SCREENS, "10-mobile-results.png") });
});
