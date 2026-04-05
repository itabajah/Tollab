import { test, expect } from '@playwright/test';

test.describe('App Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh each test
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('renders the app without errors', async ({ page }) => {
    // Header should be visible
    await expect(page.locator('header')).toBeVisible();
    // Footer should be present
    await expect(page.locator('footer')).toBeVisible();
    // No uncaught errors on load
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('shows empty state when no data exists', async ({ page }) => {
    // Course list should show empty state
    await expect(page.locator('.course-list-empty')).toBeVisible();
    await expect(page.locator('.course-list-empty')).toContainText('No courses yet');
  });

  test('add semester → add course → verify render', async ({ page }) => {
    // Step 1: Click "Add Semester" button
    await page.click('#add-semester-btn');

    // AddSemesterModal should appear
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Select a preset semester option
    const semesterSelect = page.locator('#new-semester-select');
    await expect(semesterSelect).toBeVisible();

    // Pick the first non-empty option (any preset is fine)
    const options = await semesterSelect.locator('option').allTextContents();
    const firstPreset = options.find(
      (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
    );
    if (firstPreset) {
      await semesterSelect.selectOption({ label: firstPreset });
    }

    // Click "Create Semester"
    await page.click('.modal-footer .btn-primary');

    // Modal should close
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // The semester select should now have a value
    await expect(page.locator('#semester-select')).not.toHaveValue('');

    // Step 2: Click "Add Course" button to open CourseModal
    await page.click('#add-course-fab');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Switch to Details tab
    await page.click('.course-modal-tab:has-text("Details")');

    // Fill in course name
    await page.fill('#cm-course-name', 'Test Course 101');

    // Save the course
    await page.click('.modal-actions .btn-primary');

    // Modal should close
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Step 3: Verify course renders in the list
    await expect(page.locator('.course-card')).toBeVisible();
    await expect(page.locator('.course-title')).toContainText('Test Course 101');

    // Empty state should be gone
    await expect(page.locator('.course-list-empty')).not.toBeVisible();
  });

  test('localStorage persistence survives reload', async ({ page }) => {
    // Add a semester
    await page.click('#add-semester-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    const semesterSelect = page.locator('#new-semester-select');
    const options = await semesterSelect.locator('option').allTextContents();
    const preset = options.find(
      (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
    );
    if (preset) {
      await semesterSelect.selectOption({ label: preset });
    }
    await page.click('.modal-footer .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });

    // Add a course
    await page.click('#add-course-fab');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await page.click('.course-modal-tab:has-text("Details")');
    await page.fill('#cm-course-name', 'Persistence Check');
    await page.click('.modal-actions .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('.course-title')).toContainText(
      'Persistence Check',
    );

    // Wait for persistence debounce (500ms) then reload
    await page.waitForTimeout(800);
    await page.reload();

    // Verify data survived
    await expect(page.locator('.course-card')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.course-title')).toContainText(
      'Persistence Check',
    );
  });
});
