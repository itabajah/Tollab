# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-workflow.spec.ts >> Profile Workflow >> export and import profile
- Location: tests\e2e\profile-workflow.spec.ts:111:3

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
  3   | test.describe('Profile Workflow', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.addInitScript(() => localStorage.clear());
> 6   |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  7   |   });
  8   | 
  9   |   test('create a new profile', async ({ page }) => {
  10  |     // Open settings → Profile tab
  11  |     await page.click('#settings-btn');
  12  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  13  |     await expect(page.locator('#settings-tab-profile')).toHaveClass(/active/);
  14  | 
  15  |     // Click "+ New Profile"
  16  |     const newProfileBtn = page.locator('button:has-text("New Profile")');
  17  |     await expect(newProfileBtn).toBeVisible();
  18  |     await newProfileBtn.click();
  19  | 
  20  |     // A prompt dialog should appear for the profile name
  21  |     const promptInput = page.locator(
  22  |       '.modal-overlay.active input[type="text"], .prompt-input',
  23  |     );
  24  |     if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  25  |       await promptInput.fill('Test Profile');
  26  |       // Confirm
  27  |       const confirmBtn = page
  28  |         .locator('.modal-overlay.active .btn-primary')
  29  |         .last();
  30  |       await confirmBtn.click();
  31  |     }
  32  | 
  33  |     // The profile selector should now include the new profile
  34  |     // Give it a moment to update
  35  |     await page.waitForTimeout(500);
  36  | 
  37  |     // The profile panel should still be visible
  38  |     await expect(page.locator('#settings-panel-profile')).toBeVisible();
  39  |   });
  40  | 
  41  |   test('switch between profiles', async ({ page }) => {
  42  |     // Open settings → Profile tab
  43  |     await page.click('#settings-btn');
  44  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  45  | 
  46  |     // Create a second profile first
  47  |     const newProfileBtn = page.locator('button:has-text("New Profile")');
  48  |     await expect(newProfileBtn).toBeVisible();
  49  |     await newProfileBtn.click();
  50  | 
  51  |     const promptInput = page.locator(
  52  |       '.modal-overlay.active input[type="text"], .prompt-input',
  53  |     );
  54  |     if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  55  |       await promptInput.fill('Second Profile');
  56  |       const confirmBtn = page
  57  |         .locator('.modal-overlay.active .btn-primary')
  58  |         .last();
  59  |       await confirmBtn.click();
  60  |     }
  61  | 
  62  |     await page.waitForTimeout(500);
  63  | 
  64  |     // Find the profile selector (a <select> inside the profile tab)
  65  |     const profileSelect = page.locator(
  66  |       '#settings-panel-profile select',
  67  |     );
  68  |     if (await profileSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
  69  |       const options = await profileSelect.locator('option').allTextContents();
  70  |       expect(options.length).toBeGreaterThanOrEqual(2);
  71  | 
  72  |       // Switch to the first option (original profile)
  73  |       await profileSelect.selectOption({ index: 0 });
  74  |       await page.waitForTimeout(300);
  75  |     }
  76  |   });
  77  | 
  78  |   test('rename a profile', async ({ page }) => {
  79  |     // Open settings → Profile tab
  80  |     await page.click('#settings-btn');
  81  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  82  | 
  83  |     // Click the rename button (pencil icon "✎")
  84  |     const renameBtn = page.locator('button:has-text("✎")');
  85  |     if (await renameBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  86  |       await renameBtn.click();
  87  | 
  88  |       // A text input for renaming should appear
  89  |       const renameInput = page.locator(
  90  |         '#settings-panel-profile .form-row input[type="text"]',
  91  |       );
  92  |       await expect(renameInput).toBeVisible({ timeout: 2000 });
  93  |       await renameInput.fill('Renamed Profile');
  94  | 
  95  |       // Save rename
  96  |       const saveBtn = page.locator(
  97  |         '#settings-panel-profile button:has-text("Save")',
  98  |       );
  99  |       await saveBtn.click();
  100 | 
  101 |       // Profile select should now show "Renamed Profile"
  102 |       await page.waitForTimeout(500);
  103 |       const profileSelect = page.locator('#settings-panel-profile select');
  104 |       if (await profileSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
  105 |         const selectedText = await profileSelect.locator('option:checked').textContent();
  106 |         expect(selectedText).toContain('Renamed Profile');
```