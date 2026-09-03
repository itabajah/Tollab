import { formatShortDate, parseYmd } from '@/lib/dates'
import type { MetaPart } from './types'

// ---------------------------------------------------------------------------
// Human-readable time fragments (all deterministic, no locale APIs)
// ---------------------------------------------------------------------------

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** "12 min" / "1 h" / "2 h 10 min". Never negative; 0 reads as "0 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}

/** "HH:MM" local clock time. */
export function formatClock(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** "Sun, Feb 1" for an exam date; '' for an unparseable ymd. */
export function formatWeekdayDate(ymd: string): string {
  const parsed = parseYmd(ymd)
  if (!parsed) return ''
  return `${WEEKDAY_SHORT[parsed.getDay()]}, ${formatShortDate(ymd)}`
}

/** "1 day" / "3 days". */
export function pluralDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`
}

/** Due-date fragment for homework, tinted by urgency. `diff` is calendar days until due. */
export function dueMeta(diff: number): MetaPart {
  if (diff < 0) return { text: `${pluralDays(-diff)} overdue`, tone: 'critical' }
  if (diff === 0) return { text: 'due today', tone: 'warn' }
  if (diff === 1) return { text: 'due tomorrow', tone: 'warn' }
  return { text: `due in ${pluralDays(diff)}` }
}

/** Countdown fragment for an exam. `diff` is calendar days until the exam (>= 0). */
export function examMeta(diff: number): MetaPart {
  if (diff === 0) return { text: 'today', tone: 'critical' }
  if (diff === 1) return { text: 'tomorrow', tone: 'warn' }
  if (diff <= 3) return { text: `in ${pluralDays(diff)}`, tone: 'warn' }
  return { text: `in ${pluralDays(diff)}` }
}

/**
 * Study pace for `unwatched` recordings spread over `days` days, e.g.
 * "1 lecture a day" / "2 lectures a day" / "1 lecture every 3 days".
 * Null when there is nothing to watch or no days left.
 */
export function formatPace(unwatched: number, days: number): string | null {
  if (unwatched <= 0 || days <= 0) return null
  const perDay = unwatched / days
  if (perDay >= 1) {
    const n = Math.ceil(perDay)
    return n === 1 ? '1 lecture a day' : `${n} lectures a day`
  }
  const every = Math.floor(days / unwatched)
  return every <= 1 ? '1 lecture a day' : `1 lecture every ${every} days`
}
