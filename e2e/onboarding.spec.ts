import { test, expect } from '@playwright/test'

test.describe('onboarding', () => {
  test('first run shows the empty state and creates a semester', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/no semester yet/i)).toBeVisible()

    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()

    // The semester now exists; the weekly schedule pane appears and courses empty-state shows.
    await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible()
    await expect(page.getByText(/no courses yet/i)).toBeVisible()
  })

  test('a created semester survives a reload (localStorage persistence)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()
    await expect(page.getByText(/no courses yet/i)).toBeVisible()

    await page.reload()
    await expect(page.getByText(/no courses yet/i)).toBeVisible()
    await expect(page.getByText(/no semester yet/i)).not.toBeVisible()
  })
})
