import { test, expect, type Page } from '@playwright/test'

const todayYmd = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const radar = (page: Page) => page.getByTestId('radar')
const headline = (page: Page) => radar(page).getByTestId('radar-title')

test.describe('radar', () => {
  test('guides setup, surfaces urgent homework, and acts on it in place', async ({ page }) => {
    await page.goto('/')
    await expect(headline(page)).toHaveText('Start with a semester')

    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()
    await expect(headline(page)).toHaveText('No courses yet')

    await page.getByRole('button', { name: 'Add Course' }).click()
    await page.getByLabel('Course name').fill('Physics')
    await page.getByRole('button', { name: 'Save Course' }).click()
    await expect(headline(page)).toHaveText('No class times yet')

    // Add an assignment due today through the course dialog.
    await page.getByRole('button', { name: /Edit Physics/ }).click()
    await page.getByRole('tab', { name: 'Homework' }).click()
    await page.getByLabel('Assignment', { exact: true }).fill('Wet 1')
    await page.getByLabel('Due date for new assignment').fill(todayYmd())
    await page.getByRole('button', { name: 'Add assignment' }).click()
    await page.getByRole('button', { name: 'Close' }).click()

    // The radar pins it with its facts and offers Done in place.
    await expect(headline(page)).toHaveText('Wet 1')
    await expect(radar(page)).toContainText('due today')
    await expect(radar(page)).toHaveAttribute('data-kind', 'hw_today')
    await radar(page).getByRole('button', { name: 'Mark Wet 1 done' }).click()
    await expect(headline(page)).toHaveText('No class times yet')
    await expect(page.getByRole('status').filter({ hasText: /Done:/ })).toBeVisible()

    // Snoozing the last live signal drops the card into calm rotation, and the
    // snooze survives a reload (device-local, keyed to today).
    await radar(page).getByRole('button', { name: 'Snooze until tomorrow' }).click()
    await expect(radar(page)).toHaveAttribute('data-mode', 'calm')
    await page.reload()
    await expect(radar(page)).toHaveAttribute('data-mode', 'calm')
  })

  test('opens the course dialog from the headline', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Create your first semester' }).click()
    await page.getByRole('button', { name: 'Create Semester' }).click()
    await page.getByRole('button', { name: 'Add Course' }).click()
    await page.getByLabel('Course name').fill('Calculus')
    await page.getByRole('button', { name: 'Save Course' }).click()
    await page.getByRole('button', { name: /Edit Calculus/ }).click()
    await page.getByRole('tab', { name: 'Homework' }).click()
    await page.getByLabel('Assignment', { exact: true }).fill('Series')
    await page.getByLabel('Due date for new assignment').fill(todayYmd())
    await page.getByRole('button', { name: 'Add assignment' }).click()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(headline(page)).toHaveText('Series')

    await radar(page).getByTestId('radar-main').click()
    const dialog = page.getByRole('dialog', { name: 'Edit Course' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: 'Homework' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
