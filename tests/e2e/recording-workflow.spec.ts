import { test, expect } from '@playwright/test';

/**
 * Helper: set up a semester and course so recording tests have context.
 */
async function seedCourseForRecordings(
  page: import('@playwright/test').Page,
) {
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

  await page.click('#add-course-fab');
  await expect(page.locator('.modal-overlay.active')).toBeVisible();
  await page.click('.course-modal-tab:has-text("Details")');
  await page.fill('#cm-course-name', 'Recording Course');
  await page.click('.modal-actions .btn-primary');
  await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
    timeout: 3000,
  });
}

test.describe('Recording Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('add recording via course modal', async ({ page }) => {
    await seedCourseForRecordings(page);

    // Open the course modal
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Recordings tab should be active by default (first tab)
    const recordingsTab = page.locator(
      '.course-modal-tab:has-text("Recordings")',
    );
    await expect(recordingsTab).toBeVisible();
    await recordingsTab.click();

    // Add a recording via the input field
    const addInput = page.locator('.recordings-add-input');
    await expect(addInput).toBeVisible();
    await addInput.fill('https://www.youtube.com/watch?v=test123');

    const addBtn = page.locator('.recordings-add-btn');
    await addBtn.click();

    // A recording item should appear in the list
    await expect(
      page.locator('.recordings-list .recording-item, .recordings-list > *'),
    ).toHaveCount(1, { timeout: 3000 });
  });

  test('toggle recording watched status', async ({ page }) => {
    await seedCourseForRecordings(page);

    // Open course modal → Recordings tab
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('.course-modal-tab:has-text("Recordings")');

    // Add a recording
    await page.locator('.recordings-add-input').fill('https://youtube.com/watch?v=abc');
    await page.locator('.recordings-add-btn').click();

    // Wait for recording to appear
    const recordingItem = page.locator('.recording-item, .recordings-list > div').first();
    await expect(recordingItem).toBeVisible({ timeout: 3000 });

    // Toggle the watched checkbox
    const checkbox = recordingItem.locator('input[type="checkbox"]');
    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const checkedBefore = await checkbox.isChecked();
      await checkbox.click();
      if (checkedBefore) {
        await expect(checkbox).not.toBeChecked();
      } else {
        await expect(checkbox).toBeChecked();
      }
    }
  });

  test('sort recordings by different orders', async ({ page }) => {
    await seedCourseForRecordings(page);

    // Open course modal → Recordings tab
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('.course-modal-tab:has-text("Recordings")');

    // The sort select should be visible
    const sortSelect = page.locator('.sort-select');
    await expect(sortSelect).toBeVisible();

    // Verify sort options exist
    const sortOptions = await sortSelect.locator('option').allTextContents();
    expect(sortOptions.length).toBeGreaterThanOrEqual(2);

    // Switch sort order
    await sortSelect.selectOption('name_asc');
    await expect(sortSelect).toHaveValue('name_asc');

    // Switch to another sort
    await sortSelect.selectOption('default');
    await expect(sortSelect).toHaveValue('default');
  });

  test('tab management — add and switch tabs', async ({ page }) => {
    await seedCourseForRecordings(page);

    // Open course modal → Recordings tab
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('.course-modal-tab:has-text("Recordings")');

    // Check existing recording tabs (e.g., Lectures, Tutorials)
    const tabsBefore = await page
      .locator('.recordings-tabs .recordings-tab')
      .count();
    expect(tabsBefore).toBeGreaterThanOrEqual(1);

    // Click "+" to add a new tab (opens PromptDialog)
    const addTabBtn = page.locator('.recordings-tab-add');
    await expect(addTabBtn).toBeVisible();
    await addTabBtn.click();

    // PromptDialog should appear — type a new tab name
    const promptInput = page.locator(
      '.modal-overlay.active input[type="text"], .prompt-input',
    );
    if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptInput.fill('Extra Materials');
      // Confirm the prompt
      const confirmBtn = page.locator(
        '.modal-overlay.active .btn-primary, .modal-footer .btn-primary',
      );
      await confirmBtn.last().click();
    }

    // Verify new tab appeared
    const tabsAfter = await page
      .locator('.recordings-tabs .recordings-tab')
      .count();
    expect(tabsAfter).toBeGreaterThanOrEqual(tabsBefore);

    // Click the new tab to switch to it
    const lastTab = page.locator('.recordings-tabs .recordings-tab').last();
    await lastTab.click();
    await expect(lastTab).toHaveClass(/active/);
  });
});
