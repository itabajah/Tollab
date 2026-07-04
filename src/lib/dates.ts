/**
 * Date helpers. All Tollab dates are LOCAL calendar dates in `YYYY-MM-DD`
 * ("ymd") — the Technion timezone is assumed to be the user's timezone,
 * matching the legacy app.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parses a ymd string to a local-midnight Date; null when invalid. */
export function parseYmd(ymd: string): Date | null {
  const match = YMD.exec(ymd)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  // Reject rollovers like 2026-13-45.
  if (date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null
  return date
}

export function formatYmd(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function todayYmd(now: Date): string {
  return formatYmd(now)
}

function atMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((atMidnight(b) - atMidnight(a)) / 86_400_000)
}

/** Calendar days from today until the ymd date; negative if past; null if unset. */
export function daysUntil(ymd: string, today: Date): number | null {
  const target = parseYmd(ymd)
  if (!target) return null
  return daysBetween(today, target)
}

/** Converts `dd-MM-yyyy` (also `dd.MM.yyyy`, `dd/MM/yyyy`) to ymd; null if malformed. */
export function convertDdMmYyyy(value: string): string | null {
  const match = /^(\d{2})[-./](\d{2})[-./](\d{4})$/.exec(value)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

/** Parses an ICS timestamp (`YYYYMMDDTHHMMSS` or `YYYYMMDD`) as local time. */
export function parseIcsDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(value)
  if (!match) return null
  const [, y, m, d, hh, mi, ss] = match
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh ?? 0),
    Number(mi ?? 0),
    Number(ss ?? 0),
  )
}

/** The Sunday..Saturday week containing `date` (start at 00:00, end at 23:59:59.999). */
export function weekRangeFor(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function isYmdInWeek(ymd: string, now: Date): boolean {
  const date = parseYmd(ymd)
  if (!date) return false
  const { start, end } = weekRangeFor(now)
  return date >= start && date <= end
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Feb 1" style short date for chips and roadmap nodes. */
export function formatShortDate(ymd: string): string {
  const date = parseYmd(ymd)
  if (!date) return ''
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}
