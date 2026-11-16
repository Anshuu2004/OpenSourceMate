import { test, expect } from "@playwright/test";

/**
 * Visual Regression Test Suite for Key Pages (Issue #267)
 *
 * Verifies pixel parity and catches unexpected visual mutations across:
 * - Landing Page / Home (idle state)
 * - Analyzer Results View (populated with mocked profile and issue matches)
 * - Compare Profiles Page
 *
 * Runs across desktop and mobile viewports in light and dark mode.
 */

// Helper to inject mocked API responses so visual comparisons are deterministic
const mockApiResponses = async (page: any) => {
  await page.route("**/api/v1/github/users/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        username: "octocat",
        name: "The Octocat",
        bio: "GitHub mascot and passionate open source contributor.",
        avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
        public_repositories: 12,
        followers: 4500,
        following: 10,
        profile_url: "https://github.com/octocat",
        location: "San Francisco",
        company: "@github",
        blog: "https://github.blog",
        created_at: "2011-01-25T18:44:36Z",
        fetched_at: "2026-11-16T00:00:00Z",
      }),
    });
  });

  await page.route("**/api/v1/github/users/*/skills**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        username: "octocat",
        total_repositories: 12,
        skills: [
          { name: "Python", proficiency: "Expert", repo_count: 8, percentage: 65 },
          { name: "TypeScript", proficiency: "Proficient", repo_count: 5, percentage: 25 },
          { name: "Docker", proficiency: "Learning", repo_count: 2, percentage: 10 },
        ],
      }),
    });
  });

  await page.route("**/api/v1/matching/**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        username: "octocat",
        difficulty: "beginner",
        issues: [
          {
            id: 101,
            title: "Docs: Fix typo in quickstart instructions",
            url: "https://github.com/org/repo/issues/101",
            repository: "org/repo",
            labels: ["good first issue", "documentation"],
            language: "Markdown",
            difficulty: "beginner",
            match_score: 95,
            match_reasons: ["Matched documentation skill", "Beginner friendly label"],
          },
        ],
      }),
    });
  });
};

test.describe("Landing Page Visual Regression", () => {
  test("renders landing page hero and navbar deterministically", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Mask dynamic clock or volatile items
    await expect(page).toHaveScreenshot("landing-page-full.png", {
      fullPage: true,
      mask: [page.locator('[data-testid="build-version-badge"]')],
    });
  });
});

test.describe("Profile Analyzer Visual Regression", () => {
  test("renders analyzer results view with mocked profile and matches", async ({ page }) => {
    await mockApiResponses(page);
    await page.goto("/?user=octocat");
    await page.waitForLoadState("networkidle");

    // Capture visual snapshot of the analysis view
    await expect(page).toHaveScreenshot("analyzer-results-view.png", {
      fullPage: true,
      mask: [page.locator('[data-testid="build-version-badge"]')],
    });
  });
});

test.describe("Compare Page Visual Regression", () => {
  test("renders compare page header, search inputs and cards", async ({ page }) => {
    await mockApiResponses(page);
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("compare-page-view.png", {
      fullPage: true,
      mask: [page.locator('[data-testid="build-version-badge"]')],
    });
  });
});
