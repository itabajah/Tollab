import { test, expect, type Page } from '@playwright/test'

const todayYmd = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const radar = (page: Page) => page.getByTestId('radar')
const headline = (page: Page) => radar(page).getByTestId('radar-title')

/**
 * Seeds a v3 profile straight into localStorage: a Monday 10:00–12:00 class
 * and an assignment due tomorrow, so a frozen clock at Mon 2026-03-02 11:00
 * puts the card in a deterministic "class running now" state.
 */
async function seedLiveClass(page: Page) {
  const stamp = '2026-03-02T11:00:00.000Z'
  const course = {
    id: 'c1',
    name: 'Physics',
    color: 'hsl(210, 45%, 50%)',
    number: '',
    points: '',
    lecturer: '',
    faculty: '',
    location: 'Ullman 306',
    grade: '',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [{ day: 1, start: '10:00', end: '12:00' }],
    homework: [
      { id: 'h1', title: 'Wet 1', dueDate: '2026-03-03', completed: false, notes: '', links: [] },
    ],
    recordings: {
      tabs: [
        { id: 'lectures', name: 'Lectures', items: [] },
        { id: 'tutorials', name: 'Tutorials', items: [] },
      ],
    },
    homeworkSort: 'date_asc',
    recordingsSort: {},
    showCompletedHomework: true,
  }
  const profile = {
    v: 3,
    savedAt: stamp,
    data: {
      semesters: [
        {
          id: 's1',
          name: 'Spring 2026',
          courses: [course],
          calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
          examViewMode: 'auto',
          hiddenExamIds: [],
          customExams: [],
        },
      ],
      settings: {
        theme: 'light',
        colorTheme: 'colorful',
        baseColorHue: 200,
        showCompleted: false,
        showWatchedRecordings: false,
      },
      lastModified: stamp,
    },
  }
  await page.addInitScript((data) => {
    localStorage.setItem('tollab:v3:profiles', JSON.stringify([{ id: 'p1', name: 'Default' }]))
    localStorage.setItem('tollab:v3:active', 'p1')
    localStorage.setItem('tollab:v3:profile:p1', JSON.stringify(data))
  }, profile)
}

test.describe('radar', () => {
  test('pins a running class with live progress and promotes an up-next chip', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 2, 2, 11, 0))
    await seedLiveClass(page)
    await page.goto('/')

    await expect(radar(page)).toHaveAttribute('data-kind', 'class_now')
    await expect(radar(page).getByTestId('radar-badge')).toHaveText('LIVE')
    await expect(headline(page)).toHaveText('Physics')
    await expect(radar(page)).toContainText('Ullman 306')
    await expect(radar(page)).toContainText('10:00–12:00')
    await expect(radar(page)).toContainText('ends in 1 h')
    await expect(radar(page).getByTestId('radar-progress')).toHaveCSS('width', /px/)
    const ratio = await radar(page)
      .getByTestId('radar-progress')
      .evaluate((el) => el.getBoundingClientRect().width / el.parentElement!.clientWidth)
    expect(ratio).toBeGreaterThan(0.45)
    expect(ratio).toBeLessThan(0.55)

    // The assignment waits in the rail with its fact; promoting it swaps places.
    const chip = radar(page).getByRole('button', { name: 'Show Wet 1' })
    await expect(chip).toContainText('due tomorrow')
    await chip.click()
    await expect(headline(page)).toHaveText('Wet 1')
    await expect(radar(page)).toHaveAttribute('data-kind', 'hw_tomorrow')
    await expect(radar(page).getByRole('button', { name: 'Show Physics' })).toContainText(
      'ends in 1 h',
    )
  })

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
