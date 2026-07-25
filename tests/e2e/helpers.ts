import { Page, expect } from "@playwright/test";

/**
 * Sign in via the demo path and land on the dashboard. Clears any prior state
 * so each test starts from the seeded demo data.
 */
export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /explore the demo/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /good (morning|afternoon|evening), alex/i })).toBeVisible();
}

/** Send a message through the composer on whatever screen is active. */
export async function tellMabel(page: Page, text: string) {
  const box = page.getByPlaceholder(/tell mabel anything|find me|help me choose/i).first();
  await box.click();
  await box.fill(text);
  await page.getByRole("button", { name: /send to mabel/i }).click();
}
