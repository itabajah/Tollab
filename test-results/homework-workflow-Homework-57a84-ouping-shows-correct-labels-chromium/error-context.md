# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homework-workflow.spec.ts >> Homework Workflow >> homework urgency grouping shows correct labels
- Location: tests\e2e\homework-workflow.spec.ts:124:3

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
  4   |  * Helper: set up a semester and course so homework tests have context.
  5   |  */
  6   | async function seedCourseForHomework(
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
  30  |   await page.fill('#cm-course-name', 'Homework Course');
  31  |   await page.click('.modal-actions .btn-primary');
  32  |   await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  33  |     timeout: 3000,
  34  |   });
  35  | }
  36  | 
  37  | test.describe('Homework Workflow', () => {
  38  |   test.beforeEach(async ({ page }) => {
  39  |     await page.addInitScript(() => localStorage.clear());
> 40  |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  41  |   });
  42  | 
  43  |   test('add homework via sidebar form', async ({ page }) => {
  44  |     await seedCourseForHomework(page);
  45  | 
  46  |     // The homework sidebar should be visible (right column)
  47  |     const hwSidebar = page.locator('.homework-section-header');
  48  |     await expect(hwSidebar).toBeVisible({ timeout: 5000 });
  49  | 
  50  |     // Fill in the add homework form
  51  |     const titleInput = page.locator(
  52  |       '.hw-add-row input[type="text"]',
  53  |     );
  54  |     await expect(titleInput).toBeVisible();
  55  |     await titleInput.fill('Assignment 1');
  56  | 
  57  |     // Set a due date (tomorrow)
  58  |     const dateInput = page.locator('.hw-add-row input[type="date"]');
  59  |     const tomorrow = new Date();
  60  |     tomorrow.setDate(tomorrow.getDate() + 1);
  61  |     const dateStr = tomorrow.toISOString().split('T')[0]!;
  62  |     await dateInput.fill(dateStr);
  63  | 
  64  |     // Click Add button
  65  |     await page.click('.hw-add-row .btn-secondary');
  66  | 
  67  |     // Verify homework item appeared in the sidebar list
  68  |     const hwList = page.locator('.upcoming-list');
  69  |     await expect(hwList).toBeVisible();
  70  | 
  71  |     // The homework item should contain our assignment title
  72  |     await expect(hwList).toContainText('Assignment 1', { timeout: 3000 });
  73  |   });
  74  | 
  75  |   test('complete homework and verify "Show Done" toggle', async ({ page }) => {
  76  |     await seedCourseForHomework(page);
  77  | 
  78  |     // Add homework
  79  |     const titleInput = page.locator('.hw-add-row input[type="text"]');
  80  |     await expect(titleInput).toBeVisible({ timeout: 5000 });
  81  |     await titleInput.fill('Complete Me');
  82  | 
  83  |     const dateInput = page.locator('.hw-add-row input[type="date"]');
  84  |     const tomorrow = new Date();
  85  |     tomorrow.setDate(tomorrow.getDate() + 1);
  86  |     await dateInput.fill(tomorrow.toISOString().split('T')[0]!);
  87  | 
  88  |     await page.click('.hw-add-row .btn-secondary');
  89  |     await expect(page.locator('.upcoming-list')).toContainText('Complete Me', {
  90  |       timeout: 3000,
  91  |     });
  92  | 
  93  |     // Toggle the homework as completed (click the checkbox on the homework item)
  94  |     const hwItemCheckbox = page.locator(
  95  |       '.homework-item input[type="checkbox"], .upcoming-list input[type="checkbox"]',
  96  |     );
  97  |     if (await hwItemCheckbox.first().isVisible({ timeout: 2000 }).catch(() => false)) {
  98  |       await hwItemCheckbox.first().click();
  99  | 
  100 |       // The completed homework may be hidden by default
  101 |       // Check "Show Done" toggle to reveal it
  102 |       const showDoneToggle = page.locator(
  103 |         '.show-toggle-label input[type="checkbox"]',
  104 |       );
  105 |       await expect(showDoneToggle).toBeVisible();
  106 |       const showDoneChecked = await showDoneToggle.isChecked();
  107 | 
  108 |       if (!showDoneChecked) {
  109 |         // Homework may have disappeared; toggle "Show Done" to see it
  110 |         await showDoneToggle.click();
  111 |         await expect(page.locator('.upcoming-list')).toContainText(
  112 |           'Complete Me',
  113 |           { timeout: 3000 },
  114 |         );
  115 |       }
  116 | 
  117 |       // Toggle "Show Done" off — completed homework should be hidden
  118 |       if (await showDoneToggle.isChecked()) {
  119 |         await showDoneToggle.click();
  120 |       }
  121 |     }
  122 |   });
  123 | 
  124 |   test('homework urgency grouping shows correct labels', async ({ page }) => {
  125 |     await seedCourseForHomework(page);
  126 | 
  127 |     // Add homework with no date (should appear under "No Date" group)
  128 |     const titleInput = page.locator('.hw-add-row input[type="text"]');
  129 |     await expect(titleInput).toBeVisible({ timeout: 5000 });
  130 |     await titleInput.fill('No Date HW');
  131 |     // Don't set a date
  132 |     await page.click('.hw-add-row .btn-secondary');
  133 | 
  134 |     // Verify it appears in the upcoming list
  135 |     await expect(page.locator('.upcoming-list')).toContainText('No Date HW', {
  136 |       timeout: 3000,
  137 |     });
  138 | 
  139 |     // Check that urgency section labels exist (the sidebar uses them to group)
  140 |     const urgencyLabels = page.locator('.urgency-section-label');
```