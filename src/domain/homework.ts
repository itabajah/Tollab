import type { Homework, HomeworkLink, HomeworkSort } from '@/domain/model'
import { daysUntil } from '@/lib/dates'

/**
 * Sorts homework items for display. Always returns a NEW array; the input is
 * never mutated. Mirrors the legacy sortHomework semantics:
 * - date_asc / date_desc: items with an empty dueDate always sink to the
 *   bottom (in both directions); ties keep original order.
 * - completed_first / incomplete_first: stable by original index.
 * - name_asc: localeCompare on title.
 * - manual: copy in original order.
 */
export function sortHomework(items: readonly Homework[], order: HomeworkSort): Homework[] {
  const indexed = items.map((item, index) => ({ item, index }))

  const byDate = (direction: 1 | -1) => {
    indexed.sort((a, b) => {
      if (!a.item.dueDate && !b.item.dueDate) return a.index - b.index
      if (!a.item.dueDate) return 1
      if (!b.item.dueDate) return -1
      if (a.item.dueDate === b.item.dueDate) return a.index - b.index
      // ymd strings compare correctly lexicographically.
      return a.item.dueDate < b.item.dueDate ? -direction : direction
    })
  }

  switch (order) {
    case 'date_asc':
      byDate(1)
      break
    case 'date_desc':
      byDate(-1)
      break
    case 'completed_first':
      indexed.sort((a, b) => {
        if (a.item.completed !== b.item.completed) return a.item.completed ? -1 : 1
        return a.index - b.index
      })
      break
    case 'incomplete_first':
      indexed.sort((a, b) => {
        if (a.item.completed !== b.item.completed) return a.item.completed ? 1 : -1
        return a.index - b.index
      })
      break
    case 'name_asc':
      indexed.sort(
        (a, b) => (a.item.title || '').localeCompare(b.item.title || '') || a.index - b.index,
      )
      break
    case 'manual':
      break
  }

  return indexed.map(({ item }) => item)
}

/**
 * Swaps the homework with the given id with its neighbor. Returns a NEW array;
 * a same-order copy when the id is unknown or the move would cross a boundary.
 */
export function moveHomework(items: readonly Homework[], id: string, delta: -1 | 1): Homework[] {
  const next = [...items]
  const index = next.findIndex((item) => item.id === id)
  const target = index + delta
  if (index === -1 || target < 0 || target >= next.length) return next
  const a = next[index]
  const b = next[target]
  if (a === undefined || b === undefined) return next
  next[index] = b
  next[target] = a
  return next
}

/**
 * Moves the homework with `id` past its adjacent *visible* neighbor (skipping
 * hidden items) so a manual reorder produces a real visible change even when
 * completed items are hidden. Returns a NEW array; a same-order copy when the id
 * is unknown or the move would cross the visible boundary. When everything is
 * visible this is identical to {@link moveHomework}.
 */
export function moveHomeworkAmongVisible(
  items: readonly Homework[],
  id: string,
  delta: -1 | 1,
  isVisible: (hw: Homework) => boolean,
): Homework[] {
  const next = [...items]
  const from = next.findIndex((item) => item.id === id)
  if (from === -1) return next
  let to = from + delta
  while (to >= 0 && to < next.length && !isVisible(next[to]!)) to += delta
  if (to < 0 || to >= next.length) return next
  const a = next[from]
  const b = next[to]
  if (a === undefined || b === undefined) return next
  next[from] = b
  next[to] = a
  return next
}

/**
 * Auto-label for a new homework link: "Link N" where N is one more than the
 * highest existing label matching `Link <number>` exactly (1 when none match).
 */
export function nextLinkLabel(links: readonly HomeworkLink[]): string {
  let max = 0
  for (const link of links) {
    const match = /^Link (\d+)$/.exec(link.label)
    if (match?.[1]) max = Math.max(max, parseInt(match[1], 10))
  }
  return `Link ${max + 1}`
}

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'none'

/**
 * Urgency bucket for a homework item relative to `today` (time of day is
 * ignored): overdue < 0 days, today = 0, tomorrow = 1, soon = 2..7,
 * later > 7, none when the due date is missing or invalid.
 */
export function dueBucket(hw: Homework, today: Date): DueBucket {
  const diff = daysUntil(hw.dueDate, today)
  if (diff === null) return 'none'
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'soon'
  return 'later'
}

/** True when the homework is not completed and its due date is in the past. */
export function isOverdue(hw: Homework, today: Date): boolean {
  return !hw.completed && dueBucket(hw, today) === 'overdue'
}

/** Completed/total counts for a homework list. */
export function homeworkProgress(items: readonly Homework[]): { done: number; total: number } {
  return {
    done: items.filter((item) => item.completed).length,
    total: items.length,
  }
}
