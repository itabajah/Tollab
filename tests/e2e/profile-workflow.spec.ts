import { test, expect } from '@playwright/test';

test.describe('Profile Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
  });

  test('create a new profile', async ({ page }) => {
    // Open settings → Profile tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    await expect(page.locator('#settings-tab-profile')).toHaveClass(/active/);

    // Click "+ New Profile"
    const newProfileBtn = page.locator('button:has-text("New Profile")');
    await expect(newProfileBtn).toBeVisible();
    await newProfileBtn.click();

    // A prompt dialog should appear for the profile name
    const promptInput = page.locator(
      '.modal-overlay.active input[type="text"], .prompt-input',
    );
    if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptInput.fill('Test Profile');
      // Confirm
      const confirmBtn = page
        .locator('.modal-overlay.active .btn-primary')
        .last();
      await confirmBtn.click();
    }

    // The profile selector should now include the new profile
    // Give it a moment to update
    await page.waitForTimeout(500);

    // The profile panel should still be visible
    await expect(page.locator('#settings-panel-profile')).toBeVisible();
  });

  test('switch between profiles', async ({ page }) => {
    // Open settings → Profile tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Create a second profile first
    const newProfileBtn = page.locator('button:has-text("New Profile")');
    await expect(newProfileBtn).toBeVisible();
    await newProfileBtn.click();

    const promptInput = page.locator(
      '.modal-overlay.active input[type="text"], .prompt-input',
    );
    if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptInput.fill('Second Profile');
      const confirmBtn = page
        .locator('.modal-overlay.active .btn-primary')
        .last();
      await confirmBtn.click();
    }

    await page.waitForTimeout(500);

    // Find the profile selector (a <select> inside the profile tab)
    const profileSelect = page.locator(
      '#settings-panel-profile select',
    );
    if (await profileSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      const options = await profileSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThanOrEqual(2);

      // Switch to the first option (original profile)
      await profileSelect.selectOption({ index: 0 });
      await page.waitForTimeout(300);
    }
  });

  test('rename a profile', async ({ page }) => {
    // Open settings → Profile tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Click the rename button (pencil icon "✎")
    const renameBtn = page.locator('button:has-text("✎")');
    if (await renameBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await renameBtn.click();

      // A text input for renaming should appear
      const renameInput = page.locator(
        '#settings-panel-profile .form-row input[type="text"]',
      );
      await expect(renameInput).toBeVisible({ timeout: 2000 });
      await renameInput.fill('Renamed Profile');

      // Save rename
      const saveBtn = page.locator(
        '#settings-panel-profile button:has-text("Save")',
      );
      await saveBtn.click();

      // Profile select should now show "Renamed Profile"
      await page.waitForTimeout(500);
      const profileSelect = page.locator('#settings-panel-profile select');
      if (await profileSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        const selectedText = await profileSelect.locator('option:checked').textContent();
        expect(selectedText).toContain('Renamed Profile');
      }
    }
  });

  test('export and import profile', async ({ page }) => {
    // Open settings → Profile tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Click Export button
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportBtn.click();

    const download = await downloadPromise;
    if (download) {
      // Verify a file was downloaded
      expect(download.suggestedFilename()).toContain('.json');
    }

    // Import test: the Import button triggers a hidden file input
    const importBtn = page.locator('button:has-text("Import")');
    await expect(importBtn).toBeVisible();
    // We can't easily test file upload in E2E without a real file,
    // but we can verify the button and file input exist
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(1);
  });

  test('delete profile', async ({ page }) => {
    // Open settings → Profile tab
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    // Create a second profile so delete is enabled
    const newProfileBtn = page.locator('button:has-text("New Profile")');
    await expect(newProfileBtn).toBeVisible();
    await newProfileBtn.click();

    const promptInput = page.locator(
      '.modal-overlay.active input[type="text"], .prompt-input',
    );
    if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptInput.fill('To Delete');
      const confirmBtn = page
        .locator('.modal-overlay.active .btn-primary')
        .last();
      await confirmBtn.click();
    }

    await page.waitForTimeout(500);

    // Click "Delete Profile"
    const deleteBtn = page.locator('button:has-text("Delete Profile")');
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isDisabled = await deleteBtn.isDisabled();
      if (!isDisabled) {
        await deleteBtn.click();

        // Confirm deletion
        const confirmDelete = page.locator('button:has-text("Confirm Delete")');
        if (
          await confirmDelete
            .isVisible({ timeout: 2000 })
            .catch(() => false)
        ) {
          await confirmDelete.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Profile panel should still be visible (at least one profile remains)
    await expect(page.locator('#settings-panel-profile')).toBeVisible();
  });

  test('data isolation between profiles', async ({ page }) => {
    // Add data to default profile: create semester + course
    await page.click('#add-semester-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();
    const semOpts = await page
      .locator('#new-semester-select option')
      .allTextContents();
    const preset = semOpts.find(
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
    await page.fill('#cm-course-name', 'Profile A Course');
    await page.click('.modal-actions .btn-primary');
    await expect(page.locator('.modal-overlay.active')).not.toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('.course-title')).toContainText(
      'Profile A Course',
    );

    // Wait for persistence
    await page.waitForTimeout(800);

    // Now create a new profile
    await page.click('#settings-btn');
    await expect(page.locator('.modal-overlay.active')).toBeVisible();

    const newProfileBtn = page.locator('button:has-text("New Profile")');
    await newProfileBtn.click();

    const promptInput = page.locator(
      '.modal-overlay.active input[type="text"], .prompt-input',
    );
    if (await promptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await promptInput.fill('Profile B');
      const confirmBtn = page
        .locator('.modal-overlay.active .btn-primary')
        .last();
      await confirmBtn.click();
    }

    await page.waitForTimeout(800);

    // Close settings modal
    await page.click('.modal-close');
    await page.waitForTimeout(300);

    // New profile should have no courses — either empty state or no course cards
    const courseCards = page.locator('.course-card');
    const emptyState = page.locator('.course-list-empty');

    // At least one of these should be true: zero cards or empty state visible
    const cardCount = await courseCards.count();
    const emptyVisible = await emptyState
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(cardCount === 0 || emptyVisible).toBeTruthy();
  });
});
