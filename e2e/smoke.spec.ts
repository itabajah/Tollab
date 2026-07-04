import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('loads the shell with brand and light theme', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Tollab' })).toBeVisible()
    await expect(page.getByText('For Technionez')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('theme toggle switches to dark and survives reload', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /switch to dark theme/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
