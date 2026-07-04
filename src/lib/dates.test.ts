import {
  parseYmd,
  formatYmd,
  daysBetween,
  daysUntil,
  convertDdMmYyyy,
  parseIcsDate,
  weekRangeFor,
  isYmdInWeek,
  formatShortDate,
  todayYmd,
} from './dates'

describe('parseYmd / formatYmd', () => {
  it('round-trips a local date', () => {
    const d = parseYmd('2026-02-01')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
    expect(formatYmd(d)).toBe('2026-02-01')
  })

  it('returns null for invalid input', () => {
    expect(parseYmd('')).toBeNull()
    expect(parseYmd('not-a-date')).toBeNull()
    expect(parseYmd('2026-13-45')).toBeNull()
  })
})

describe('daysBetween / daysUntil', () => {
  it('counts calendar days ignoring time of day', () => {
    expect(daysBetween(new Date('2026-02-01T23:00:00'), new Date('2026-02-02T01:00:00'))).toBe(1)
    expect(daysBetween(new Date('2026-02-01T00:00:00'), new Date('2026-02-01T23:59:00'))).toBe(0)
  })

  it('daysUntil is negative for past dates', () => {
    const today = new Date('2026-02-10T10:00:00')
    expect(daysUntil('2026-02-12', today)).toBe(2)
    expect(daysUntil('2026-02-10', today)).toBe(0)
    expect(daysUntil('2026-02-08', today)).toBe(-2)
    expect(daysUntil('', today)).toBeNull()
  })
})

describe('convertDdMmYyyy', () => {
  it('converts dd-MM-yyyy to yyyy-MM-dd', () => {
    expect(convertDdMmYyyy('01-02-2026')).toBe('2026-02-01')
    expect(convertDdMmYyyy('15.03.2026')).toBe('2026-03-15')
    expect(convertDdMmYyyy('15/03/2026')).toBe('2026-03-15')
  })

  it('returns null for malformed input', () => {
    expect(convertDdMmYyyy('2026-02-01')).toBeNull()
    expect(convertDdMmYyyy('')).toBeNull()
  })
})

describe('parseIcsDate', () => {
  it('parses YYYYMMDDTHHMMSS', () => {
    const d = parseIcsDate('20260201T103000')!
    expect(formatYmd(d)).toBe('2026-02-01')
    expect(d.getHours()).toBe(10)
    expect(d.getMinutes()).toBe(30)
  })

  it('parses date-only YYYYMMDD', () => {
    const d = parseIcsDate('20260201')!
    expect(formatYmd(d)).toBe('2026-02-01')
  })

  it('returns null for junk', () => {
    expect(parseIcsDate('junk')).toBeNull()
  })
})

describe('weekRangeFor / isYmdInWeek', () => {
  it('spans Sunday..Saturday around the given date', () => {
    // 2026-07-04 is a Saturday
    const { start, end } = weekRangeFor(new Date('2026-07-04T15:00:00'))
    expect(formatYmd(start)).toBe('2026-06-28') // Sunday
    expect(formatYmd(end)).toBe('2026-07-04') // Saturday
  })

  it('checks membership by calendar day', () => {
    const now = new Date('2026-07-01T12:00:00') // Wednesday
    expect(isYmdInWeek('2026-06-28', now)).toBe(true)
    expect(isYmdInWeek('2026-07-04', now)).toBe(true)
    expect(isYmdInWeek('2026-07-05', now)).toBe(false)
    expect(isYmdInWeek('', now)).toBe(false)
  })
})

describe('formatShortDate / todayYmd', () => {
  it('formats a ymd as a short readable date', () => {
    expect(formatShortDate('2026-02-01')).toBe('Feb 1')
  })

  it('returns empty string for invalid ymd', () => {
    expect(formatShortDate('')).toBe('')
  })

  it('todayYmd formats the given now', () => {
    expect(todayYmd(new Date('2026-07-04T23:59:00'))).toBe('2026-07-04')
  })
})
