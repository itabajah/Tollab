# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: course-workflow.spec.ts >> Course Workflow — Full CRUD >> edit course name via modal
- Location: tests\e2e\course-workflow.spec.ts:59:3

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
  4   |  * Helper: bootstrap app with a semester and a course so we don't
  5   |  * repeat the same 20 lines in every test.
  6   |  */
  7   | async function seedSemesterAndCourse(
  8   |   page: import('@playwright/test').Page,
  9   |   courseName = 'Algorithms',
  10  | ) {
  11  |   // Add semester
  12  |   await page.click('#add-semester-btn');
  13  |   await expect(page.locator('.modal-overlay.active')).toBeVisible();
  14  |   const options = await page
  15  |     .locator('#new-semester-select option')
  16  |     .allTextContents();
  17  |   const preset = options.find(
  18  |     (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
  19  |   );
  20  |   if (preset) {
  21  |     await page
  22  |       .locator('#new-semester-select')
  23  |       .selectOption({ label: preset });
  24  |   }
  25  |   await page.click('.modal-footer .btn-primary');
  26  |   await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  27  |     timeout: 3000,
  28  |   });
  29  | 
  30  |   // Add course
  31  |   await page.click('#add-course-fab');
  32  |   await expect(page.locator('.modal-overlay.active')).toBeVisible();
  33  |   await page.click('.course-modal-tab:has-text("Details")');
  34  |   await page.fill('#cm-course-name', courseName);
  35  |   await page.click('.modal-actions .btn-primary');
  36  |   await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  37  |     timeout: 3000,
  38  |   });
  39  |   await expect(page.locator('.course-title')).toContainText(courseName);
  40  | }
  41  | 
  42  | test.describe('Course Workflow — Full CRUD', () => {
  43  |   test.beforeEach(async ({ page }) => {
  44  |     await page.addInitScript(() => localStorage.clear());
> 45  |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  46  |   });
  47  | 
  48  |   test('add course → verify card renders with metadata', async ({ page }) => {
  49  |     await seedSemesterAndCourse(page, 'Data Structures');
  50  | 
  51  |     // Card should be visible
  52  |     const card = page.locator('.course-card').first();
  53  |     await expect(card).toBeVisible();
  54  |     await expect(card.locator('.course-title')).toContainText(
  55  |       'Data Structures',
  56  |     );
  57  |   });
  58  | 
  59  |   test('edit course name via modal', async ({ page }) => {
  60  |     await seedSemesterAndCourse(page, 'Old Name');
  61  | 
  62  |     // Click the course card to re-open the modal in edit mode
  63  |     await page.locator('.course-card').first().click();
  64  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  65  | 
  66  |     // Switch to Details tab
  67  |     await page.click('.course-modal-tab:has-text("Details")');
  68  |     await expect(page.locator('#cm-course-name')).toBeVisible();
  69  | 
  70  |     // Clear and type new name
  71  |     await page.fill('#cm-course-name', 'New Name');
  72  | 
  73  |     // Save
  74  |     await page.click('.modal-actions .btn-primary');
  75  |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  76  |       timeout: 3000,
  77  |     });
  78  | 
  79  |     // Verify updated
  80  |     await expect(page.locator('.course-title')).toContainText('New Name');
  81  |   });
  82  | 
  83  |   test('change course color via hue slider', async ({ page }) => {
  84  |     await seedSemesterAndCourse(page, 'Colorful Course');
  85  | 
  86  |     // Open course modal
  87  |     await page.locator('.course-card').first().click();
  88  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  89  | 
  90  |     // Switch to Details tab
  91  |     await page.click('.course-modal-tab:has-text("Details")');
  92  | 
  93  |     // Adjust color hue slider
  94  |     const hueSlider = page.locator('#cm-color-hue');
  95  |     await expect(hueSlider).toBeVisible();
  96  | 
  97  |     // Set to a new value
  98  |     await hueSlider.fill('200');
  99  | 
  100 |     // Save
  101 |     await page.click('.modal-actions .btn-primary');
  102 |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  103 |       timeout: 3000,
  104 |     });
  105 | 
  106 |     // Verify the course card border color changed (it's set via inline style)
  107 |     const card = page.locator('.course-card').first();
  108 |     const style = await card.getAttribute('style');
  109 |     expect(style).toBeTruthy();
  110 |   });
  111 | 
  112 |   test('add schedule slot → verify calendar shows event', async ({ page }) => {
  113 |     await seedSemesterAndCourse(page, 'Scheduled Course');
  114 | 
  115 |     // Open course modal
  116 |     await page.locator('.course-card').first().click();
  117 |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  118 | 
  119 |     // Switch to Details tab
  120 |     await page.click('.course-modal-tab:has-text("Details")');
  121 | 
  122 |     // Fill schedule slot fields (day, start, end)
  123 |     const daySelect = page.locator('#cm-schedule-day');
  124 |     const startInput = page.locator('#cm-schedule-start');
  125 |     const endInput = page.locator('#cm-schedule-end');
  126 | 
  127 |     // These might exist as a schedule builder section
  128 |     if (await daySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
  129 |       await daySelect.selectOption({ index: 1 }); // Sunday or first available
  130 |       await startInput.fill('10:00');
  131 |       await endInput.fill('12:00');
  132 | 
  133 |       // Click the add schedule slot button
  134 |       const addSlotBtn = page.locator(
  135 |         'button:has-text("Add"), .schedule-add-btn',
  136 |       );
  137 |       if (await addSlotBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
  138 |         await addSlotBtn.first().click();
  139 |       }
  140 |     }
  141 | 
  142 |     // Save course
  143 |     await page.click('.modal-actions .btn-primary');
  144 |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  145 |       timeout: 3000,
```