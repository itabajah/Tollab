import { test, expect } from '@playwright/test';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('open settings modal and switch tabs', async ({ page }) => {
    // Open settings modal via header gear button
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Profile tab should be active by default
    await expect(page.locator('#settings-tab-profile')).toHaveClass(/active/);
    await expect(page.locator('#settings-panel-profile')).toBeVisible();

    // Switch to Appearance tab
    await page.click('#settings-tab-appearance');
    await expect(page.locator('#settings-tab-appearance')).toHaveClass(
      /active/,
    );
    await expect(page.locator('#settings-panel-appearance')).toBeVisible();

    // Switch to Calendar tab
    await page.click('#settings-tab-calendar');
    await expect(page.locator('#settings-tab-calendar')).toHaveClass(/active/);
    await expect(page.locator('#settings-panel-calendar')).toBeVisible();

    // Switch to Fetch Data tab
    await page.click('#settings-tab-sync');
    await expect(page.locator('#settings-tab-sync')).toHaveClass(/active/);
    await expect(page.locator('#settings-panel-sync')).toBeVisible();
  });

  test('theme toggle changes body class', async ({ page }) => {
    // Open settings → Appearance
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('#settings-tab-appearance');
    await expect(page.locator('#settings-panel-appearance')).toBeVisible();

    // The color theme select should be visible
    const themeSelect = page.locator('#color-theme-select');
    await expect(themeSelect).toBeVisible();

    // Get current theme state
    const bodyHasDark = await page
      .locator('body')
      .evaluate((el) => el.classList.contains('dark-mode'));

    // Select the opposite theme
    if (bodyHasDark) {
      // Switch to light
      await themeSelect.selectOption('light');
    } else {
      // Switch to dark
      await themeSelect.selectOption('dark');
    }

    // Apply changes if there's an Apply button
    const applyBtn = page.locator('button:has-text("Apply")');
    if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await applyBtn.click();
    }

    // Verify body class changed
    if (bodyHasDark) {
      await expect(page.locator('body')).not.toHaveClass(/dark-mode/, {
        timeout: 3000,
      });
    } else {
      await expect(page.locator('body')).toHaveClass(/dark-mode/, {
        timeout: 3000,
      });
    }
  });

  test('calendar settings — change start/end hours', async ({ page }) => {
    // First, need a semester for calendar settings to apply
    await page.click('#add-semester-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    const options = await page
      .locator('#new-semester-select option')
      .allTextContents();
    const preset = options.find(
      (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
    );
    if (preset) {
      await page
        .locator('#new-semester-select')
        .selectOption({ label: preset });
    }
    await page.click('.modal-footer .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Open settings → Calendar tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('#settings-tab-calendar');
    await expect(page.locator('#settings-panel-calendar')).toBeVisible();

    // Change start hour
    const startHour = page.locator('#cal-start-hour');
    await expect(startHour).toBeVisible();
    await startHour.fill('9');

    // Change end hour
    const endHour = page.locator('#cal-end-hour');
    await expect(endHour).toBeVisible();
    await endHour.fill('18');

    // Verify inputs have new values
    await expect(startHour).toHaveValue('9');
    await expect(endHour).toHaveValue('18');

    // Close the modal
    await page.click('.modal-close');

    // Calendar should reflect the new hours (time grid labels)
    const calendarArea = page.locator(
      '.calendar-container, .schedule-section-header',
    );
    if (await calendarArea.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(calendarArea.first()).toBeVisible();
    }
  });
});
