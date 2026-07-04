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

/** The color a newly added course gets, given how many courses already exist. */
export function nextCourseColor(existingCount: number, settings: ColorSettings): string {
  return generateCourseColor(existingCount, existingCount + 1, settings)
}

/** Extracts the hue from an `hsl(...)` string; 0 when unparseable. */
export function hueFromColor(color: string): number {
  const match = /hsl\((\d+)/.exec(color)
  return match ? Number(match[1]) : 0
}
