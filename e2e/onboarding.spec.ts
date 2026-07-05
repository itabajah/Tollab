import { test, expect } from '@playwright/test'

test.describe('onboarding', () => {
  test('first run shows the empty state and creates a semester', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/no semester yet/i)).toBeVisible()

    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()

    // The semester now exists; the weekly schedule pane appears and courses empty-state shows.
    // (Exact text — the header ticker can also render a "No courses yet" nudge.)
    await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible()
    await expect(page.getByText('No courses yet in this semester.')).toBeVisible()
  })

  test('a created semester survives a reload (localStorage persistence)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()
    await expect(page.getByText('No courses yet in this semester.')).toBeVisible()

    await page.reload()
    await expect(page.getByText('No courses yet in this semester.')).toBeVisible()
    await expect(page.getByText(/no semester yet/i)).not.toBeVisible()
  })
})
