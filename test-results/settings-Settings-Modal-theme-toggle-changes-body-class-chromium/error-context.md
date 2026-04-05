# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings Modal >> theme toggle changes body class
- Location: tests\e2e\settings.spec.ts:36:3

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
  3   | test.describe('Settings Modal', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.addInitScript(() => localStorage.clear());
> 6   |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  7   |   });
  8   | 
  9   |   test('open settings modal and switch tabs', async ({ page }) => {
  10  |     // Open settings modal via header gear button
  11  |     await page.click('#settings-btn');
  12  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  13  | 
  14  |     // Profile tab should be active by default
  15  |     await expect(page.locator('#settings-tab-profile')).toHaveClass(/active/);
  16  |     await expect(page.locator('#settings-panel-profile')).toBeVisible();
  17  | 
  18  |     // Switch to Appearance tab
  19  |     await page.click('#settings-tab-appearance');
  20  |     await expect(page.locator('#settings-tab-appearance')).toHaveClass(
  21  |       /active/,
  22  |     );
  23  |     await expect(page.locator('#settings-panel-appearance')).toBeVisible();
  24  | 
  25  |     // Switch to Calendar tab
  26  |     await page.click('#settings-tab-calendar');
  27  |     await expect(page.locator('#settings-tab-calendar')).toHaveClass(/active/);
  28  |     await expect(page.locator('#settings-panel-calendar')).toBeVisible();
  29  | 
  30  |     // Switch to Fetch Data tab
  31  |     await page.click('#settings-tab-sync');
  32  |     await expect(page.locator('#settings-tab-sync')).toHaveClass(/active/);
  33  |     await expect(page.locator('#settings-panel-sync')).toBeVisible();
  34  |   });
  35  | 
  36  |   test('theme toggle changes body class', async ({ page }) => {
  37  |     // Open settings → Appearance
  38  |     await page.click('#settings-btn');
  39  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  40  |     await page.click('#settings-tab-appearance');
  41  |     await expect(page.locator('#settings-panel-appearance')).toBeVisible();
  42  | 
  43  |     // The color theme select should be visible
  44  |     const themeSelect = page.locator('#color-theme-select');
  45  |     await expect(themeSelect).toBeVisible();
  46  | 
  47  |     // Get current theme state
  48  |     const bodyHasDark = await page
  49  |       .locator('body')
  50  |       .evaluate((el) => el.classList.contains('dark-mode'));
  51  | 
  52  |     // Select the opposite theme
  53  |     if (bodyHasDark) {
  54  |       // Switch to light
  55  |       await themeSelect.selectOption('light');
  56  |     } else {
  57  |       // Switch to dark
  58  |       await themeSelect.selectOption('dark');
  59  |     }
  60  | 
  61  |     // Apply changes if there's an Apply button
  62  |     const applyBtn = page.locator('button:has-text("Apply")');
  63  |     if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  64  |       await applyBtn.click();
  65  |     }
  66  | 
  67  |     // Verify body class changed
  68  |     if (bodyHasDark) {
  69  |       await expect(page.locator('body')).not.toHaveClass(/dark-mode/, {
  70  |         timeout: 3000,
  71  |       });
  72  |     } else {
  73  |       await expect(page.locator('body')).toHaveClass(/dark-mode/, {
  74  |         timeout: 3000,
  75  |       });
  76  |     }
  77  |   });
  78  | 
  79  |   test('calendar settings — change start/end hours', async ({ page }) => {
  80  |     // First, need a semester for calendar settings to apply
  81  |     await page.click('#add-semester-btn');
  82  |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  83  |     const options = await page
  84  |       .locator('#new-semester-select option')
  85  |       .allTextContents();
  86  |     const preset = options.find(
  87  |       (o) => o && o !== '' && o.toLowerCase() !== 'custom...',
  88  |     );
  89  |     if (preset) {
  90  |       await page
  91  |         .locator('#new-semester-select')
  92  |         .selectOption({ label: preset });
  93  |     }
  94  |     await page.click('.modal-footer .btn-primary');
  95  |     await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
  96  |       timeout: 3000,
  97  |     });
  98  | 
  99  |     // Open settings → Calendar tab
  100 |     await page.click('#settings-btn');
  101 |     await expect(page.locator('.modal-overlay.active')).toBeVisible();
  102 |     await page.click('#settings-tab-calendar');
  103 |     await expect(page.locator('#settings-panel-calendar')).toBeVisible();
  104 | 
  105 |     // Change start hour
  106 |     const startHour = page.locator('#cal-start-hour');
```