import { safeHref } from './safeHref'

describe('safeHref', () => {
  it('allows absolute http and https URLs', () => {
    expect(safeHref('https://example.com/watch?v=1')).toBe('https://example.com/watch?v=1')
    expect(safeHref('http://example.com')).toBe('http://example.com')
  })

  it('rejects javascript: and other non-http(s) schemes', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,<script>x</script>')).toBeUndefined()
    expect(safeHref('mailto:a@b.com')).toBeUndefined()
    expect(safeHref('vbscript:msgbox(1)')).toBeUndefined()
  })

  it('rejects unparseable, relative, or empty values', () => {
    expect(safeHref('not a url')).toBeUndefined()
    expect(safeHref('/relative/path')).toBeUndefined()
    expect(safeHref('')).toBeUndefined()
  })
})
