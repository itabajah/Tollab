import { test, expect, type Page } from '@playwright/test'

async function createSemester(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create your first semester' }).click()
  await page.getByRole('button', { name: 'Create Semester' }).click()
  await expect(page.getByRole('heading', { name: 'Weekly Schedule' })).toBeVisible()
}

const viewSwitch = (page: Page) => page.getByRole('group', { name: 'Right panel view' })
// The right pane's scroll field: the homework list's parent (see RightPane).
const scrollField = (page: Page) => page.locator('#homework-list').locator('xpath=..')

/** The Schedule|Exams switch is pinned; only the content under it scrolls, with no visible bar. */
test.describe('right pane scrolling', () => {
  for (const width of [1440, 1100]) {
    test(`desktop @${width}px: the view switch stays put while the pane scrolls`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await createSemester(page)

      const field = scrollField(page)
      const geom = await field.evaluate((el: HTMLElement) => ({
        overflows: el.scrollHeight > el.clientHeight,
        scrollbarWidth: el.offsetWidth - el.clientWidth,
        overflowY: getComputedStyle(el).overflowY,
      }))
      expect(geom.overflows).toBe(true)
      expect(geom.overflowY).toBe('auto')
      expect(geom.scrollbarWidth).toBe(0)

      const before = await viewSwitch(page).boundingBox()
      await field.evaluate((el: HTMLElement) => el.scrollBy(0, 400))
      expect(await field.evaluate((el: HTMLElement) => el.scrollTop)).toBeGreaterThan(0)

      const after = await viewSwitch(page).boundingBox()
      expect(after!.y).toBeCloseTo(before!.y, 0)

      // The window itself never scrolls on desktop — each pane owns its scrolling.
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
      )
      expect(pageOverflow).toBeLessThanOrEqual(0)
    })
  }

  test('mobile: the view switch sticks to the top of the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createSemester(page)

    await page.getByRole('heading', { name: 'Weekly Schedule' }).scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 1200)
    await expect
      .poll(async () => (await viewSwitch(page).boundingBox())!.y, { timeout: 3000 })
      .toBeLessThan(40)
    await expect(viewSwitch(page)).toBeInViewport()
  })
})
