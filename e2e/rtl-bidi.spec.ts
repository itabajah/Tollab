import { test, expect, type Page } from '@playwright/test'

// Technion course names are usually Hebrew (RTL); the UI around them is LTR English.
const HEBREW_COURSE = 'מערכות ספרתיות ומבנה המחשב'
const DAYS_OUT = 8

/** `yyyy-mm-dd`, `days` from today, so the due badge reads "<days>d left". */
function dueIn(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

async function seedHebrewCourseWithHomework(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create your first semester' }).click()
  await page.getByRole('button', { name: 'Create Semester' }).click()

  await page.getByRole('button', { name: 'Add Course' }).click()
  await page.getByLabel('Course name').fill(HEBREW_COURSE)
  await page.getByRole('button', { name: 'Save Course' }).click()

  await page.getByRole('button', { name: `Edit ${HEBREW_COURSE}` }).click()
  await page.getByRole('tab', { name: 'Homework' }).click()
  await page.getByLabel('Assignment', { exact: true }).fill('Wet 1')
  await page.getByLabel('Due date for new assignment').fill(dueIn(DAYS_OUT))
  await page.getByRole('button', { name: 'Add assignment' }).click()
  await page.keyboard.press('Escape')

  await expect(page.locator('#homework-list').getByText('Wet 1')).toBeVisible()
}

/**
 * Bidi reordering only happens in a real layout engine — jsdom has none, so this is
 * the only place the fix can actually be observed. The sidebar subtitle is
 * "<hebrew course> · 8d left"; with the course name unisolated, the bidi algorithm
 * dragged the badge's leading digit to the far side of the Hebrew run and rendered
 * "8 · <hebrew course> d left", tearing the badge into separate visual fragments.
 */
test.describe('RTL course names', () => {
  test('the due badge stays one unbroken run to the right of a Hebrew course name', async ({
    page,
  }) => {
    await seedHebrewCourseWithHomework(page)

    // Located by position, not by <bdi>, so the assertions below fail on the
    // rendering if the isolation is ever dropped — not on a missing selector.
    const subtitle = page.locator('#homework-list [data-homework-id] p').nth(1)
    await expect(subtitle).toContainText(`${DAYS_OUT}d left`)

    const geom = await subtitle.evaluate((p: HTMLElement) => {
      const badge = p.querySelector('span')!
      // The name is a <bdi> once isolated and a bare text node otherwise; a Range
      // measures where it actually landed either way.
      const name = p.querySelector('bdi') ?? p.firstChild!
      const range = document.createRange()
      range.selectNodeContents(name)
      return {
        // An inline box torn apart by bidi reordering yields one client rect per
        // fragment, so the badge surviving as exactly one rect IS the fix.
        badgeFragments: badge.getClientRects().length,
        badgeLeft: badge.getBoundingClientRect().left,
        nameRight: range.getBoundingClientRect().right,
        lineDirection: getComputedStyle(p).direction,
      }
    })

    // Unisolated, the badge splits into three fragments ("·", "8", "d left") and
    // its leading digit lands left of the Hebrew name instead of after it.
    expect(geom.badgeFragments).toBe(1)
    expect(geom.badgeLeft).toBeGreaterThanOrEqual(geom.nameRight - 1)
    // The Hebrew name resolves RTL inside its own run without flipping the line.
    expect(geom.lineDirection).toBe('ltr')
  })
})
