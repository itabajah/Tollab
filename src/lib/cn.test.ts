import { cn } from './cn'

describe('cn', () => {
  it('joins truthy class names with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('skips falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'c')).toBe('a c')
  })

  it('returns an empty string with no arguments', () => {
    expect(cn()).toBe('')
  })
})
