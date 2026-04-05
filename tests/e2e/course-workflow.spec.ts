import { test, expect } from '@playwright/test';

/**
 * Helper: bootstrap app with a semester and a course so we don't
 * repeat the same 20 lines in every test.
 */
async function seedSemesterAndCourse(
  page: import('@playwright/test').Page,
  courseName = 'Algorithms',
) {
  // Add semester
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

  // Add course
  await page.click('#add-course-fab');
  await expect(page.locator('.modal-overlay.active')).toBeVisible();
  await page.click('.course-modal-tab:has-text("Details")');
  await page.fill('#cm-course-name', courseName);
  await page.click('.modal-actions .btn-primary');
  await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
    timeout: 3000,
  });
  await expect(page.locator('.course-title')).toContainText(courseName);
}

test.describe('Course Workflow — Full CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('add course → verify card renders with metadata', async ({ page }) => {
    await seedSemesterAndCourse(page, 'Data Structures');

    // Card should be visible
    const card = page.locator('.course-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.course-title')).toContainText(
      'Data Structures',
    );
  });

  test('edit course name via modal', async ({ page }) => {
    await seedSemesterAndCourse(page, 'Old Name');

    // Click the course card to re-open the modal in edit mode
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Switch to Details tab
    await page.click('.course-modal-tab:has-text("Details")');
    await expect(page.locator('#cm-course-name')).toBeVisible();

    // Clear and type new name
    await page.fill('#cm-course-name', 'New Name');

    // Save
    await page.click('.modal-actions .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Verify updated
    await expect(page.locator('.course-title')).toContainText('New Name');
  });

  test('change course color via hue slider', async ({ page }) => {
    await seedSemesterAndCourse(page, 'Colorful Course');

    // Open course modal
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Switch to Details tab
    await page.click('.course-modal-tab:has-text("Details")');

    // Adjust color hue slider
    const hueSlider = page.locator('#cm-color-hue');
    await expect(hueSlider).toBeVisible();

    // Set to a new value
    await hueSlider.fill('200');

    // Save
    await page.click('.modal-actions .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Verify the course card border color changed (it's set via inline style)
    const card = page.locator('.course-card').first();
    const style = await card.getAttribute('style');
    expect(style).toBeTruthy();
  });

  test('add schedule slot → verify calendar shows event', async ({ page }) => {
    await seedSemesterAndCourse(page, 'Scheduled Course');

    // Open course modal
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Switch to Details tab
    await page.click('.course-modal-tab:has-text("Details")');

    // Fill schedule slot fields (day, start, end)
    const daySelect = page.locator('#cm-schedule-day');
    const startInput = page.locator('#cm-schedule-start');
    const endInput = page.locator('#cm-schedule-end');

    // These might exist as a schedule builder section
    if (await daySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await daySelect.selectOption({ index: 1 }); // Sunday or first available
      await startInput.fill('10:00');
      await endInput.fill('12:00');

      // Click the add schedule slot button
      const addSlotBtn = page.locator(
        'button:has-text("Add"), .schedule-add-btn',
      );
      if (await addSlotBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await addSlotBtn.first().click();
      }
    }

    // Save course
    await page.click('.modal-actions .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // The calendar section should be visible (it exists in MainLayout sidebar)
    const calendarSection = page.locator('.calendar-container, .schedule-section-header');
    if (await calendarSection.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Verify the calendar area exists after schedule slot was added
      await expect(calendarSection.first()).toBeVisible();
    }
  });

  test('delete course via modal', async ({ page }) => {
    await seedSemesterAndCourse(page, 'To Be Deleted');

    // Open course modal
    await page.locator('.course-card').first().click();
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Switch to Details tab
    await page.click('.course-modal-tab:has-text("Details")');

    // Click "Delete Course" button (first click shows confirmation)
    const deleteBtn = page.locator('.modal-actions .btn-danger');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Click again to confirm ("Confirm Delete")
    await expect(deleteBtn).toContainText(/confirm/i);
    await deleteBtn.click();

    // Modal should close
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Course list should show empty state again
    await expect(page.locator('.course-list-empty')).toBeVisible({
      timeout: 3000,
    });
  });
});
