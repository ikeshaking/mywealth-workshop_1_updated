import { defineConfig, devices } from "@playwright/test";

/**
 * This environment ships a pre-installed Chromium that may not match the
 * revision @playwright/test would download. When it exists, point Playwright at
 * it via executablePath so tests run without `playwright install`.
 */
const fs = require("node:fs");
const CANDIDATES = [
  // Headless shell implements the "old headless" mode Playwright 1.47 launches with.
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
];
const executablePath = CANDIDATES.find((p) => fs.existsSync(p));

/**
 * Playwright config for Mabel's five core demo flows.
 * Runs against the app in demo mode (no external services required).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    viewport: { width: 390, height: 844 }, // mobile-first
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
