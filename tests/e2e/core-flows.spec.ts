import { test, expect } from "@playwright/test";
import { loginAsDemo, tellMabel } from "./helpers";

/**
 * End-to-end coverage of Mabel's five core demo flows. Runs against the app in
 * demo mode (seeded data, deterministic fallback AI, simulated actions).
 */

test.describe("Mabel core demo flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("Flow 1: Car registration — capture, then add the due date", async ({ page }) => {
    await page.goto("/capture");
    await tellMabel(page, "I need to sort my car rego soon.");

    // Mabel confirms and offers a next step.
    await expect(page.getByText(/got it\. i've added your/i)).toBeVisible();
    // A structured preview is shown with a way to open the item.
    const open = page.getByRole("link", { name: /open item/i }).first();
    await expect(open).toBeVisible();
    await open.click();

    await expect(page).toHaveURL(/\/items\//);
    await expect(page.getByText(/mabel.s understanding/i)).toBeVisible();

    // The due date is unknown; add it via Update details.
    await page.getByRole("button", { name: /update details/i }).click();
    await page.locator('input[type="date"]').fill("2026-08-15");
    await expect(page.getByText(/15 aug 2026/i)).toBeVisible();
  });

  test("Flow 2: Bill reminder — capture with a reminder date", async ({ page }) => {
    await page.goto("/capture");
    await tellMabel(page, "Remind me to pay my electricity bill tomorrow.");
    await expect(page.getByText(/got it\./i)).toBeVisible();
    await page.getByRole("link", { name: /open item/i }).first().click();
    await expect(page).toHaveURL(/\/items\//);
    // A reminder was scheduled.
    await expect(page.getByText(/reminder/i).first()).toBeVisible();
  });

  test("Flow 3: Shopping decision — get bundles, best match, approve", async ({ page }) => {
    await page.goto("/capture");
    await tellMabel(page, "Find me an outdoor dining set under $2,000 that seats six.");

    const options = page.getByRole("link", { name: /view options/i }).first();
    await expect(options).toBeVisible();
    await options.click();

    await expect(page).toHaveURL(/\/decisions\//);
    await expect(page.getByText(/best match/i).first()).toBeVisible();

    // Approve the best-match purchase → routed to approvals.
    await page.getByRole("button", { name: /approve purchase/i }).first().click();
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.getByText(/prepare purchase of/i)).toBeVisible();
  });

  test("Flow 4: Subscription cancellation — capture, approve, complete", async ({ page }) => {
    await page.goto("/capture");
    await tellMabel(page, "I keep paying for a gym membership I don't use.");
    await expect(page.getByText(/got it\./i)).toBeVisible();

    // The seeded gym cancellation is already awaiting approval.
    await page.goto("/approvals");
    await expect(page.getByText(/cancel your gym membership/i)).toBeVisible();
    await page.getByRole("button", { name: /^approve$/i }).first().click();

    // It moves to history as approved and shows in Completed.
    await page.getByRole("tab", { name: /history/i }).click();
    await expect(page.getByText(/approved/i).first()).toBeVisible();

    await page.goto("/completed");
    await expect(page.getByText(/gym|streaming|water/i).first()).toBeVisible();
  });

  test("Flow 5: Family appointment — Mabel asks who and when", async ({ page }) => {
    await page.goto("/capture");
    await tellMabel(page, "I need to book the kids into the dentist.");

    // Mabel asks a short follow-up for the missing details.
    await expect(page.getByText(/which of the kids|preferred|who and/i).first()).toBeVisible();
    await page.getByRole("link", { name: /open item/i }).first().click();
    await expect(page).toHaveURL(/\/items\//);
    await expect(page.getByText(/needs a detail/i).first()).toBeVisible();
  });
});
