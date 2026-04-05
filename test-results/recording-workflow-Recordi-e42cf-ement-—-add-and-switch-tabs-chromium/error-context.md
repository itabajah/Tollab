# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recording-workflow.spec.ts >> Recording Workflow >> tab management — add and switch tabs
- Location: tests\e2e\recording-workflow.spec.ts:125:3

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
  3   | /**
  4   |  * Helper: set up a semester and course so recording tests have context.
  5   |  */
  6   | async function seedCourseForRecordings(
  7   |   page: import('@playwright/test').Page,
  8   | ) {
  9   |   await page.click('#add-semester-btn');
  10  |   await expect(page.locator('.modal-overlay.active')).toBeVisible();
  11  |   const options = await page
  12  |     .locator('#new-semester-select option')
  13  |     .allTextContents();
  14  |   const preset = options.find(
  15  |     (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
  16  |   );
  17  |   if (preset) {
  18  |     await page
  19  |       .locator('#new-semester-select')
  20  |       .selectOption({ label: preset });
  21  |   }
  22  |   await page.click('.modal-footer .btn-primary');
  23  |   await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  24  |     timeout: 3000,
  25  |   });
  26  | 
  27  |   await page.click('#add-course-fab');
  28  |   await expect(page.locator('.modal-overlay.active')).toBeVisible();
  29  |   await page.click('.course-modal-tab:has-text("Details")');
  30  |   await page.fill('#cm-course-name', 'Recording Course');
  31  |   await page.click('.modal-actions .btn-primary');
  32  |   await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  33  |     timeout: 3000,
  34  |   });
  35  | }
  36  | 
  37  | test.describe('Recording Workflow', () => {
  38  |   test.beforeEach(async ({ page }) => {
  39  |     await page.addInitScript(() => localStorage.clear());
> 40  |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  41  |   });
  42  | 
  43  |   test('add recording via course modal', async ({ page }) => {
  44  |     await seedCourseForRecordings(page);
  45  | 
  46  |     // Open the course modal
  47  |     await page.locator('.course-card').first().click();
  48  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  49  | 
  50  |     // Recordings tab should be active by default (first tab)
  51  |     const recordingsTab = page.locator(
  52  |       '.course-modal-tab:has-text("Recordings")',
  53  |     );
  54  |     await expect(recordingsTab).toBeVisible();
  55  |     await recordingsTab.click();
  56  | 
  57  |     // Add a recording via the input field
  58  |     const addInput = page.locator('.recordings-add-input');
  59  |     await expect(addInput).toBeVisible();
  60  |     await addInput.fill('https://www.youtube.com/watch?v=test123');
  61  | 
  62  |     const addBtn = page.locator('.recordings-add-btn');
  63  |     await addBtn.click();
  64  | 
  65  |     // A recording item should appear in the list
  66  |     await expect(
  67  |       page.locator('.recordings-list .recording-item, .recordings-list > *'),
  68  |     ).toHaveCount(1, { timeout: 3000 });
  69  |   });
  70  | 
  71  |   test('toggle recording watched status', async ({ page }) => {
  72  |     await seedCourseForRecordings(page);
  73  | 
  74  |     // Open course modal → Recordings tab
  75  |     await page.locator('.course-card').first().click();
  76  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  77  |     await page.click('.course-modal-tab:has-text("Recordings")');
  78  | 
  79  |     // Add a recording
  80  |     await page.locator('.recordings-add-input').fill('https://youtube.com/watch?v=abc');
  81  |     await page.locator('.recordings-add-btn').click();
  82  | 
  83  |     // Wait for recording to appear
  84  |     const recordingItem = page.locator('.recording-item, .recordings-list > div').first();
  85  |     await expect(recordingItem).toBeVisible({ timeout: 3000 });
  86  | 
  87  |     // Toggle the watched checkbox
  88  |     const checkbox = recordingItem.locator('input[type="checkbox"]');
  89  |     if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
  90  |       const checkedBefore = await checkbox.isChecked();
  91  |       await checkbox.click();
  92  |       if (checkedBefore) {
  93  |         await expect(checkbox).not.toBeChecked();
  94  |       } else {
  95  |         await expect(checkbox).toBeChecked();
  96  |       }
  97  |     }
  98  |   });
  99  | 
  100 |   test('sort recordings by different orders', async ({ page }) => {
  101 |     await seedCourseForRecordings(page);
  102 | 
  103 |     // Open course modal → Recordings tab
  104 |     await page.locator('.course-card').first().click();
  105 |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  106 |     await page.click('.course-modal-tab:has-text("Recordings")');
  107 | 
  108 |     // The sort select should be visible
  109 |     const sortSelect = page.locator('.sort-select');
  110 |     await expect(sortSelect).toBeVisible();
  111 | 
  112 |     // Verify sort options exist
  113 |     const sortOptions = await sortSelect.locator('option').allTextContents();
  114 |     expect(sortOptions.length).toBeGreaterThanOrEqual(2);
  115 | 
  116 |     // Switch sort order
  117 |     await sortSelect.selectOption('name_asc');
  118 |     await expect(sortSelect).toHaveValue('name_asc');
  119 | 
  120 |     // Switch to another sort
  121 |     await sortSelect.selectOption('default');
  122 |     await expect(sortSelect).toHaveValue('default');
  123 |   });
  124 | 
  125 |   test('tab management — add and switch tabs', async ({ page }) => {
  126 |     await seedCourseForRecordings(page);
  127 | 
  128 |     // Open course modal → Recordings tab
  129 |     await page.locator('.course-card').first().click();
  130 |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  131 |     await page.click('.course-modal-tab:has-text("Recordings")');
  132 | 
  133 |     // Check existing recording tabs (e.g., Lectures, Tutorials)
  134 |     const tabsBefore = await page
  135 |       .locator('.recordings-tabs .recordings-tab')
  136 |       .count();
  137 |     expect(tabsBefore).toBeGreaterThanOrEqual(1);
  138 | 
  139 |     // Click "+" to add a new tab (opens PromptDialog)
  140 |     const addTabBtn = page.locator('.recordings-tab-add');
```