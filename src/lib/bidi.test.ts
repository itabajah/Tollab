import { isolate } from './bidi'

const FSI = '\u2068'
const PDI = '\u2069'
const HEBREW = 'מבוא למדעי המחשב'

describe('isolate', () => {
  it('wraps a value in first-strong-isolate / pop-directional-isolate', () => {
    expect(isolate(HEBREW)).toBe(`${FSI}${HEBREW}${PDI}`)
  })

  it('isolates LTR values too — the point is to fence off the neighbors, not the content', () => {
    expect(isolate('Algorithms 1')).toBe(`${FSI}Algorithms 1${PDI}`)
  })

  it('passes an empty string through so no stray control characters are emitted', () => {
    expect(isolate('')).toBe('')
  })

  it('leaves the visible text untouched', () => {
    const wrapped = isolate(`${HEBREW} 10:00-12:00`)
    expect(wrapped.replace(/[\u2068\u2069]/g, '')).toBe(`${HEBREW} 10:00-12:00`)
  })
})
