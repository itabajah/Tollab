import type { Homework } from '@/domain/model'
import { daysUntil } from '@/lib/dates'

/** Relative urgency badge (overdue / today / tomorrow / N days), token-colored. */
export function dueBadge(homework: Homework, today: Date): { text: string; tone: string } | null {
  if (homework.completed) return null
  const diff = daysUntil(homework.dueDate, today)
  if (diff === null) return null
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, tone: 'text-error-text font-medium' }
  if (diff === 0) return { text: 'Today', tone: 'text-warning-text font-medium' }
  if (diff === 1) return { text: 'Tomorrow', tone: 'text-warning-text' }
  return { text: `${diff}d left`, tone: 'text-ink-faint' }
}
