import { generateCourseColor, nextCourseColor, hueFromColor, courseColorFromHue } from './colors'

const colorful = { colorTheme: 'colorful', baseColorHue: 200 } as const
const single = { colorTheme: 'single', baseColorHue: 200 } as const
const mono = { colorTheme: 'mono', baseColorHue: 200 } as const

describe('generateCourseColor', () => {
  it('colorful: distributes hues by the golden angle (137°)', () => {
    expect(generateCourseColor(0, 5, colorful)).toBe('hsl(0, 45%, 50%)')
    expect(generateCourseColor(1, 5, colorful)).toBe('hsl(137, 45%, 50%)')
    expect(generateCourseColor(2, 5, colorful)).toBe('hsl(274, 45%, 50%)')
    expect(generateCourseColor(3, 5, colorful)).toBe('hsl(51, 45%, 50%)') // 411 % 360
  })

  it('single: spreads ±30° around the base hue', () => {
    expect(generateCourseColor(0, 3, single)).toBe('hsl(170, 45%, 50%)') // 200 - 30
    expect(generateCourseColor(1, 3, single)).toBe('hsl(200, 45%, 50%)')
    expect(generateCourseColor(2, 3, single)).toBe('hsl(230, 45%, 50%)') // 200 + 30
  })

  it('single: a lone course sits exactly on the base hue', () => {
    expect(generateCourseColor(0, 1, single)).toBe('hsl(200, 45%, 50%)')
  })

  it('single: wraps hues around 360', () => {
    expect(generateCourseColor(2, 3, { colorTheme: 'single', baseColorHue: 350 })).toBe(
      'hsl(20, 45%, 50%)',
    )
  })

  it('mono: always mid-grey', () => {
    expect(generateCourseColor(0, 5, mono)).toBe('hsl(0, 0%, 50%)')
    expect(generateCourseColor(4, 5, mono)).toBe('hsl(0, 0%, 50%)')
  })
})

describe('nextCourseColor', () => {
  it('picks the color a new course would get (colorful)', () => {
    expect(nextCourseColor(0, colorful)).toBe('hsl(0, 45%, 50%)')
    expect(nextCourseColor(3, colorful)).toBe('hsl(51, 45%, 50%)')
  })

  it('picks the color a new course would get (single, matches legacy math)', () => {
    // legacy: totalCourses = count + 1; offset = (count / (total - 1)) * 60 - 30 = +30 when count > 0
    expect(nextCourseColor(0, single)).toBe('hsl(200, 45%, 50%)')
    expect(nextCourseColor(2, single)).toBe('hsl(230, 45%, 50%)')
  })
})

describe('hueFromColor', () => {
  it('extracts the hue from an hsl string', () => {
    expect(hueFromColor('hsl(137, 45%, 50%)')).toBe(137)
  })

  it('falls back to 0 for unparseable colors', () => {
    expect(hueFromColor('#ff0000')).toBe(0)
    expect(hueFromColor('')).toBe(0)
  })
})

describe('courseColorFromHue', () => {
  it('builds the canonical course color for a hue', () => {
    expect(courseColorFromHue(42)).toBe('hsl(42, 45%, 50%)')
  })
})
