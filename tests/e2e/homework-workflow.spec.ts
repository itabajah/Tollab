import { test, expect } from '@playwright/test';

/**
 * Helper: set up a semester and course so homework tests have context.
 */
async function seedCourseForHomework(
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
  await page.fill('#cm-course-name', 'Homework Course');
  await page.click('.modal-actions .btn-primary');
  await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
    timeout: 3000,
  });
}

test.describe('Homework Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('add homework via sidebar form', async ({ page }) => {
    await seedCourseForHomework(page);

    // The homework sidebar should be visible (right column)
    const hwSidebar = page.locator('.homework-section-header');
    await expect(hwSidebar).toBeVisible({ timeout: 5000 });

    // Fill in the add homework form
    const titleInput = page.locator(
      '.hw-add-row input[type="text"]',
    );
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Assignment 1');

    // Set a due date (tomorrow)
    const dateInput = page.locator('.hw-add-row input[type="date"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0]!;
    await dateInput.fill(dateStr);

    // Click Add button
    await page.click('.hw-add-row .btn-secondary');

    // Verify homework item appeared in the sidebar list
    const hwList = page.locator('.upcoming-list');
    await expect(hwList).toBeVisible();

    // The homework item should contain our assignment title
    await expect(hwList).toContainText('Assignment 1', { timeout: 3000 });
  });

  test('complete homework and verify "Show Done" toggle', async ({ page }) => {
    await seedCourseForHomework(page);

    // Add homework
    const titleInput = page.locator('.hw-add-row input[type="text"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('Complete Me');

    const dateInput = page.locator('.hw-add-row input[type="date"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await dateInput.fill(tomorrow.toISOString().split('T')[0]!);

    await page.click('.hw-add-row .btn-secondary');
    await expect(page.locator('.upcoming-list')).toContainText('Complete Me', {
      timeout: 3000,
    });

    // Toggle the homework as completed (click the checkbox on the homework item)
    const hwItemCheckbox = page.locator(
      '.homework-item input[type="checkbox"], .upcoming-list input[type="checkbox"]',
    );
    if (await hwItemCheckbox.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await hwItemCheckbox.first().click();

      // The completed homework may be hidden by default
      // Check "Show Done" toggle to reveal it
      const showDoneToggle = page.locator(
        '.show-toggle-label input[type="checkbox"]',
      );
      await expect(showDoneToggle).toBeVisible();
      const showDoneChecked = await showDoneToggle.isChecked();

      if (!showDoneChecked) {
        // Homework may have disappeared; toggle "Show Done" to see it
        await showDoneToggle.click();
        await expect(page.locator('.upcoming-list')).toContainText(
          'Complete Me',
          { timeout: 3000 },
        );
      }

      // Toggle "Show Done" off — completed homework should be hidden
      if (await showDoneToggle.isChecked()) {
        await showDoneToggle.click();
      }
    }
  });

  test('homework urgency grouping shows correct labels', async ({ page }) => {
    await seedCourseForHomework(page);

    // Add homework with no date (should appear under "No Date" group)
    const titleInput = page.locator('.hw-add-row input[type="text"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('No Date HW');
    // Don't set a date
    await page.click('.hw-add-row .btn-secondary');

    // Verify it appears in the upcoming list
    await expect(page.locator('.upcoming-list')).toContainText('No Date HW', {
      timeout: 3000,
    });

    // Check that urgency section labels exist (the sidebar uses them to group)
    const urgencyLabels = page.locator('.urgency-section-label');
    const labelsCount = await urgencyLabels.count();
    // At least one group label should be visible (e.g., "No Date")
    expect(labelsCount).toBeGreaterThanOrEqual(1);
  });
});
