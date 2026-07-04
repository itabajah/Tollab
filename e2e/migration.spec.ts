import { test, expect } from '@playwright/test'

// A legacy compact-v2 localStorage blob (the format the old vanilla-JS app wrote).
const LEGACY_PROFILE = {
  v: 2,
  t: '2026-01-10T12:00:00.000Z',
  d: [
    {
      i: 'sem1',
      n: 'Winter 2025-2026',
      c: [
        {
          i: 'c1',
          n: 'Legacy Algorithms',
          cl: 'hsl(137, 45%, 50%)',
          num: '234247',
          gr: '88',
        },
      ],
    },
  ],
}

test.describe('legacy migration', () => {
  test('migrates old localStorage into the v3 app on first load', async ({ page }) => {
    await page.addInitScript(
      ([profile]) => {
        localStorage.setItem(
          'tollab_profiles',
          JSON.stringify([{ id: 'default', name: 'My Old Profile' }]),
        )
        localStorage.setItem('tollab_active', 'default')
        localStorage.setItem('tollab_default', JSON.stringify(profile))
      },
      [LEGACY_PROFILE],
    )

    await page.goto('/')

    // The migrated semester and course render.
    await expect(page.getByText('Legacy Algorithms')).toBeVisible()
    await expect(page.getByText(/#234247/)).toBeVisible()
    await expect(page.getByText(/Grade: 88%/)).toBeVisible()

    // Legacy keys are preserved (rollback safety); v3 keys are written.
    const keys = await page.evaluate(() => ({
      legacy: localStorage.getItem('tollab_default') !== null,
      migrated: localStorage.getItem('tollab:v3:migrated') !== null,
      v3profile: Object.keys(localStorage).some((k) => k.startsWith('tollab:v3:profile:')),
    }))
    expect(keys.legacy).toBe(true)
    expect(keys.migrated).toBe(true)
    expect(keys.v3profile).toBe(true)
  })
})
