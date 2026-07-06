import type { Homework } from '@/domain/model'
import { daysUntil, formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { dueBadge } from './dueBadge'

/** Short date plus a relative urgency badge. */
export function DueLabel({ homework, today }: { homework: Homework; today: Date }) {
  const diff = daysUntil(homework.dueDate, today)
  if (diff === null) {
    return <span className="text-xs text-ink-faint italic">No date</span>
  }
  const badge = dueBadge(homework, today)
  return (
    <span className="text-xs text-ink-faint">
      Due {formatShortDate(homework.dueDate)}
      {badge ? <span className={cn('ml-1.5', badge.tone)}>[{badge.text}]</span> : null}
    </span>
  )
}
