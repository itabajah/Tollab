import { test, expect } from '@playwright/test'

async function createSemester(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create your first semester' }).click()
  await page.getByRole('button', { name: 'Create Semester' }).click()
  await expect(page.getByText(/no courses yet/i)).toBeVisible()
}

test.describe('courses', () => {
  test('adds a course and shows it as a card', async ({ page }) => {
    await createSemester(page)
    await page.getByRole('button', { name: 'Add Course' }).click()
    await page.getByLabel('Course name').fill('Algorithms 1')
    await page.getByLabel('Course number').fill('234247')
    await page.getByRole('button', { name: 'Save Course' }).click()

    // Target the card's edit button (the toast also contains the name).
    await expect(page.getByRole('button', { name: /Edit Algorithms 1/ })).toBeVisible()
    await expect(page.getByText(/#234247/)).toBeVisible()
  })

  test('a course survives a reload', async ({ page }) => {
    await createSemester(page)
    await page.getByRole('button', { name: 'Add Course' }).click()
    await page.getByLabel('Course name').fill('Calculus 2')
    await page.getByRole('button', { name: 'Save Course' }).click()
    await expect(page.getByRole('button', { name: /Edit Calculus 2/ })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: /Edit Calculus 2/ })).toBeVisible()
  })

  test('toggles dark theme and persists it', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /switch to dark theme/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
