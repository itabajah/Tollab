# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app-lifecycle.spec.ts >> App Lifecycle >> renders the app without errors
- Location: tests\e2e\app-lifecycle.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('App Lifecycle', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Clear localStorage to start fresh each test
  6   |     await page.addInitScript(() => localStorage.clear());
> 7   |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  8   |   });
  9   | 
  10  |   test('renders the app without errors', async ({ page }) => {
  11  |     // Header should be visible
  12  |     await expect(page.locator('header')).toBeVisible();
  13  |     // Footer should be present
  14  |     await expect(page.locator('footer')).toBeVisible();
  15  |     // No uncaught errors on load
  16  |     const errors: string[] = [];
  17  |     page.on('pageerror', (err) => errors.push(err.message));
  18  |     await page.waitForTimeout(500);
  19  |     expect(errors).toHaveLength(0);
  20  |   });
  21  | 
  22  |   test('shows empty state when no data exists', async ({ page }) => {
  23  |     // Course list should show empty state
  24  |     await expect(page.locator('.course-list-empty')).toBeVisible();
  25  |     await expect(page.locator('.course-list-empty')).toContainText('No courses yet');
  26  |   });
  27  | 
  28  |   test('add semester → add course → verify render', async ({ page }) => {
  29  |     // Step 1: Click "Add Semester" button
  30  |     await page.click('#add-semester-btn');
  31  | 
  32  |     // AddSemesterModal should appear
  33  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  34  | 
  35  |     // Select a preset semester option
  36  |     const semesterSelect = page.locator('#new-semester-select');
  37  |     await expect(semesterSelect).toBeVisible();
  38  | 
  39  |     // Pick the first non-empty option (any preset is fine)
  40  |     const options = await semesterSelect.locator('option').allTextContents();
  41  |     const firstPreset = options.find(
  42  |       (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
  43  |     );
  44  |     if (firstPreset) {
  45  |       await semesterSelect.selectOption({ label: firstPreset });
  46  |     }
  47  | 
  48  |     // Click "Create Semester"
  49  |     await page.click('.modal-footer .btn-primary');
  50  | 
  51  |     // Modal should close
  52  |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  53  |       timeout: 3000,
  54  |     });
  55  | 
  56  |     // The semester select should now have a value
  57  |     await expect(page.locator('#semester-select')).not.toHaveValue('');
  58  | 
  59  |     // Step 2: Click "Add Course" button to open CourseModal
  60  |     await page.click('#add-course-fab');
  61  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  62  | 
  63  |     // Switch to Details tab
  64  |     await page.click('.course-modal-tab:has-text("Details")');
  65  | 
  66  |     // Fill in course name
  67  |     await page.fill('#cm-course-name', 'Test Course 101');
  68  | 
  69  |     // Save the course
  70  |     await page.click('.modal-actions .btn-primary');
  71  | 
  72  |     // Modal should close
  73  |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  74  |       timeout: 3000,
  75  |     });
  76  | 
  77  |     // Step 3: Verify course renders in the list
  78  |     await expect(page.locator('.course-card')).toBeVisible();
  79  |     await expect(page.locator('.course-title')).toContainText('Test Course 101');
  80  | 
  81  |     // Empty state should be gone
  82  |     await expect(page.locator('.course-list-empty')).not.toBeVisible();
  83  |   });
  84  | 
  85  |   test('localStorage persistence survives reload', async ({ page }) => {
  86  |     // Add a semester
  87  |     await page.click('#add-semester-btn');
  88  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  89  | 
  90  |     const semesterSelect = page.locator('#new-semester-select');
  91  |     const options = await semesterSelect.locator('option').allTextContents();
  92  |     const preset = options.find(
  93  |       (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
  94  |     );
  95  |     if (preset) {
  96  |       await semesterSelect.selectOption({ label: preset });
  97  |     }
  98  |     await page.click('.modal-footer .btn-primary');
  99  |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  100 |       timeout: 3000,
  101 |     });
  102 | 
  103 |     // Add a course
  104 |     await page.click('#add-course-fab');
  105 |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  106 |     await page.click('.course-modal-tab:has-text("Details")');
  107 |     await page.fill('#cm-course-name', 'Persistence Check');
```