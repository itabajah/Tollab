/**
 * Course color generation. Colors are always `hsl(H, 45%, 50%)`; only the hue
 * strategy varies by color theme:
 *  - colorful: golden-angle (137°) walk for maximally distinct hues
 *  - single:   hues spread ±30° around the user's base hue
 *  - mono:     fixed mid-grey
 */

export const GOLDEN_ANGLE = 137

export interface ColorSettings {
  colorTheme: 'colorful' | 'single' | 'mono'
  baseColorHue: number
}

export function courseColorFromHue(hue: number): string {
  return `hsl(${hue}, 45%, 50%)`
}

export function generateCourseColor(
  index: number,
  totalCourses: number,
  settings: ColorSettings,
): string {
  switch (settings.colorTheme) {
    case 'mono':
      return 'hsl(0, 0%, 50%)'
    case 'single': {
      const hueOffset = totalCourses > 1 ? (index / (totalCourses - 1)) * 60 - 30 : 0
      const hue = (((settings.baseColorHue + hueOffset) % 360) + 360) % 360
      return courseColorFromHue(hue)
    }
    case 'colorful':
      return courseColorFromHue((index * GOLDEN_ANGLE) % 360)
  }
}

/**
 * The color a newly added course should get, given the colors already in use.
 * Uses the existing colors (not just a count) so that:
 *  - colorful: it picks the first golden-angle hue not already taken — no
 *    collision even after a middle course was removed;
 *  - single: it golden-walks the ±30° band by count, so each added course gets a
 *    distinct hue (a plain even spread would put every appended course at +30°).
 */
export function nextCourseColor(existingColors: string[], settings: ColorSettings): string {
  if (settings.colorTheme === 'mono') return 'hsl(0, 0%, 50%)'
  if (settings.colorTheme === 'single') {
    // Golden-walk the ±30° band by count: index 0 sits exactly on the base hue,
    // later courses fan out to distinct offsets (a plain even spread collapsed
    // every appended course onto +30°).
    const r = (existingColors.length * GOLDEN_ANGLE) % 60
    const offset = r <= 30 ? r : r - 60
    const hue = (((settings.baseColorHue + offset) % 360) + 360) % 360
    return courseColorFromHue(hue)
  }
  const used = new Set(existingColors.map(hueFromColor))
  // The golden-angle walk visits all 360 integer hues before repeating (gcd 1),
  // so bound the search: once every hue is taken (360+ colorful courses) accept a
  // repeat rather than spin forever and freeze the tab.
  for (let i = 0; i < 360; i++) {
    const hue = (i * GOLDEN_ANGLE) % 360
    if (!used.has(hue)) return courseColorFromHue(hue)
  }
  return courseColorFromHue((existingColors.length * GOLDEN_ANGLE) % 360)
}

/** Extracts the hue from an `hsl(...)` string; 0 when unparseable. */
export function hueFromColor(color: string): number {
  const match = /hsl\((\d+)/.exec(color)
  return match ? Number(match[1]) : 0
}
