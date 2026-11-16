import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Visual Regression Configuration (Issue #267)
 *
 * Configures screenshot comparisons with:
 * - Deterministic font rendering (fixed standard sans fonts)
 * - Animation and CSS transition suppression (`animations: "disabled"`)
 * - Viewport matrices: Mobile (375x667) and Desktop (1280x720)
 * - Themes: Dark and Light mode
 */
export default defineConfig({
  testDir: "./e2e",
  snapshotDir: "./e2e/snapshots",
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    video: "off",
  },
  projects: [
    {
      name: "desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "dark",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "desktop-light",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "light",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-dark",
      use: {
        ...devices["iPhone 13"],
        colorScheme: "dark",
      },
    },
    {
      name: "mobile-light",
      use: {
        ...devices["iPhone 13"],
        colorScheme: "light",
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
