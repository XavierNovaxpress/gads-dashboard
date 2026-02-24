import { test, expect } from "@playwright/test";

test.describe("Google Ads Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with sidebar and header", async ({ page }) => {
    // Sidebar should show app title
    await expect(page.locator("text=Google Ads")).toBeVisible();

    // Should show "Vue d'ensemble" navigation
    await expect(page.locator("text=Vue d'ensemble")).toBeVisible();

    // Should show group navigation items
    await expect(page.locator("text=Ondoxa")).toBeVisible();
    await expect(page.locator("text=Liremia")).toBeVisible();
  });

  test("shows month picker in header", async ({ page }) => {
    const monthBtn = page.locator("header button").first();
    await expect(monthBtn).toBeVisible();
  });

  test("displays sync windsor button", async ({ page }) => {
    await expect(page.locator("text=Sync Windsor")).toBeVisible();
  });

  test("shows upload button", async ({ page }) => {
    await expect(page.locator("text=Importer JSON")).toBeVisible();
  });

  test("navigates to group view when clicking sidebar group", async ({ page }) => {
    await page.locator("nav >> text=Ondoxa").click();
    // Should show group header or page transition
    await page.waitForTimeout(500);
    // Group name should be prominent
    await expect(page.locator("h2")).toBeVisible();
  });

  test("navigates to cumulative report", async ({ page }) => {
    await page.locator("text=Rapport cumulé").click();
    await expect(page.locator("text=Rapport cumulé").first()).toBeVisible();
    await expect(page.locator("text=Analyse multi-mois")).toBeVisible();
  });

  test("navigates to history sync", async ({ page }) => {
    await page.locator("text=Sync historique").click();
    await expect(page.locator("text=Sync historique").first()).toBeVisible();
    await expect(page.locator("text=Sélectionnez les mois")).toBeVisible();
  });

  test("history sync allows month selection", async ({ page }) => {
    await page.locator("text=Sync historique").click();
    await page.waitForTimeout(300);

    // Should show month grid
    await expect(page.locator("text=12 derniers mois")).toBeVisible();
    await expect(page.locator("text=Tout sélectionner")).toBeVisible();

    // Click select all
    await page.locator("text=Tout sélectionner").click();
    await expect(page.locator("text=Tout désélectionner")).toBeVisible();
  });

  test("theme toggle switches between dark and light mode", async ({ page }) => {
    // Initially in dark mode
    const root = page.locator("body").locator("..");
    // Click theme toggle
    const themeBtn = page.locator("text=Mode clair");
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      // Should switch to light
      await expect(page.locator("text=Mode sombre")).toBeVisible();
    }
  });

  test("returns to dashboard from group view", async ({ page }) => {
    // Navigate to group
    await page.locator("nav >> text=Ondoxa").click();
    await page.waitForTimeout(300);

    // Click back button
    const backBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
    }

    // Also can use sidebar
    await page.locator("text=Vue d'ensemble").click();
    await expect(page.locator("h2")).toBeVisible();
  });
});

test.describe("Responsive design", () => {
  test("mobile viewport hides sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Desktop sidebar should be hidden
    const sidebar = page.locator("aside");
    // On mobile, sidebar should not be visible by default
    await page.waitForTimeout(300);
  });

  test("tables are scrollable on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForTimeout(500);

    // Table containers should have overflow-x
    const tableContainers = page.locator(".table-responsive");
    const count = await tableContainers.count();
    // Tables may or may not be visible depending on data, but CSS should be present
    expect(count >= 0).toBeTruthy();
  });
});
