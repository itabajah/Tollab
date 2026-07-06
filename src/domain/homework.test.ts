import type { Homework, HomeworkLink } from '@/domain/model'
import {
  sortHomework,
  moveHomework,
  moveHomeworkAmongVisible,
  nextLinkLabel,
  dueBucket,
  isOverdue,
  homeworkProgress,
} from '@/domain/homework'

function hw(overrides: Partial<Homework> & { id: string }): Homework {
  return {
    title: overrides.id,
    dueDate: '',
    completed: false,
    notes: '',
    links: [],
    ...overrides,
  }
}

function link(label: string): HomeworkLink {
  return { label, url: 'https://example.com' }
}

const ids = (items: readonly Homework[]) => items.map((item) => item.id)

describe('sortHomework', () => {
  it('returns a new array and does not mutate the input', () => {
    const items = [hw({ id: 'a', dueDate: '2026-07-10' }), hw({ id: 'b', dueDate: '2026-07-01' })]
    const before = ids(items)
    const sorted = sortHomework(items, 'date_asc')
    expect(sorted).not.toBe(items)
    expect(ids(items)).toEqual(before)
    expect(ids(sorted)).toEqual(['b', 'a'])
  })

  it('returns an empty array for empty input', () => {
    expect(sortHomework([], 'date_asc')).toEqual([])
    expect(sortHomework([], 'manual')).toEqual([])
  })

  describe('manual', () => {
    it('keeps original order but returns a copy', () => {
      const items = [hw({ id: 'b' }), hw({ id: 'a' }), hw({ id: 'c' })]
      const sorted = sortHomework(items, 'manual')
      expect(ids(sorted)).toEqual(['b', 'a', 'c'])
      expect(sorted).not.toBe(items)
    })
  })

  describe('date_asc', () => {
    it('sorts by due date ascending', () => {
      const items = [
        hw({ id: 'a', dueDate: '2026-07-10' }),
        hw({ id: 'b', dueDate: '2026-07-01' }),
        hw({ id: 'c', dueDate: '2026-07-05' }),
      ]
      expect(ids(sortHomework(items, 'date_asc'))).toEqual(['b', 'c', 'a'])
    })

    it('sinks items with empty due date to the bottom', () => {
      const items = [
        hw({ id: 'none1', dueDate: '' }),
        hw({ id: 'a', dueDate: '2026-07-10' }),
        hw({ id: 'none2', dueDate: '' }),
        hw({ id: 'b', dueDate: '2026-07-01' }),
      ]
      expect(ids(sortHomework(items, 'date_asc'))).toEqual(['b', 'a', 'none1', 'none2'])
    })

    it('keeps original order for equal dates (stable)', () => {
      const items = [
        hw({ id: 'x', dueDate: '2026-07-05' }),
        hw({ id: 'y', dueDate: '2026-07-05' }),
        hw({ id: 'z', dueDate: '2026-07-01' }),
        hw({ id: 'w', dueDate: '2026-07-05' }),
      ]
      expect(ids(sortHomework(items, 'date_asc'))).toEqual(['z', 'x', 'y', 'w'])
    })

    it('keeps original order among items with empty due dates', () => {
      const items = [hw({ id: 'p', dueDate: '' }), hw({ id: 'q', dueDate: '' })]
      expect(ids(sortHomework(items, 'date_asc'))).toEqual(['p', 'q'])
    })

    it('sorts across month and year boundaries', () => {
      const items = [
        hw({ id: 'a', dueDate: '2027-01-01' }),
        hw({ id: 'b', dueDate: '2026-12-31' }),
        hw({ id: 'c', dueDate: '2026-02-01' }),
      ]
      expect(ids(sortHomework(items, 'date_asc'))).toEqual(['c', 'b', 'a'])
    })
  })

  describe('date_desc', () => {
    it('sorts by due date descending with empty dates still at the bottom', () => {
      const items = [
        hw({ id: 'none', dueDate: '' }),
        hw({ id: 'a', dueDate: '2026-07-01' }),
        hw({ id: 'b', dueDate: '2026-07-10' }),
        hw({ id: 'c', dueDate: '2026-07-05' }),
      ]
      expect(ids(sortHomework(items, 'date_desc'))).toEqual(['b', 'c', 'a', 'none'])
    })

    it('keeps original order for equal dates (stable)', () => {
      const items = [hw({ id: 'x', dueDate: '2026-07-05' }), hw({ id: 'y', dueDate: '2026-07-05' })]
      expect(ids(sortHomework(items, 'date_desc'))).toEqual(['x', 'y'])
    })
  })

  describe('completed_first', () => {
    it('puts completed items first, each group stable by original index', () => {
      const items = [
        hw({ id: 'a', completed: false }),
        hw({ id: 'b', completed: true }),
        hw({ id: 'c', completed: false }),
        hw({ id: 'd', completed: true }),
      ]
      expect(ids(sortHomework(items, 'completed_first'))).toEqual(['b', 'd', 'a', 'c'])
    })
  })

  describe('incomplete_first', () => {
    it('puts incomplete items first, each group stable by original index', () => {
      const items = [
        hw({ id: 'a', completed: true }),
        hw({ id: 'b', completed: false }),
        hw({ id: 'c', completed: true }),
        hw({ id: 'd', completed: false }),
      ]
      expect(ids(sortHomework(items, 'incomplete_first'))).toEqual(['b', 'd', 'a', 'c'])
    })
  })

  describe('name_asc', () => {
    it('sorts by title with localeCompare', () => {
      const items = [
        hw({ id: '1', title: 'gamma' }),
        hw({ id: '2', title: 'Alpha' }),
        hw({ id: '3', title: 'beta' }),
      ]
      expect(ids(sortHomework(items, 'name_asc'))).toEqual(['2', '3', '1'])
    })
  })
})

describe('moveHomework', () => {
  const items = [hw({ id: 'a' }), hw({ id: 'b' }), hw({ id: 'c' })]

  it('moves an item down (delta +1) by swapping with the next item', () => {
    expect(ids(moveHomework(items, 'a', 1))).toEqual(['b', 'a', 'c'])
  })

  it('moves an item up (delta -1) by swapping with the previous item', () => {
    expect(ids(moveHomework(items, 'c', -1))).toEqual(['a', 'c', 'b'])
  })

  it('is a no-op (same order copy) when moving the first item up', () => {
    const result = moveHomework(items, 'a', -1)
    expect(ids(result)).toEqual(['a', 'b', 'c'])
    expect(result).not.toBe(items)
  })

  it('is a no-op when moving the last item down', () => {
    expect(ids(moveHomework(items, 'c', 1))).toEqual(['a', 'b', 'c'])
  })

  it('is a no-op for an unknown id', () => {
    expect(ids(moveHomework(items, 'nope', 1))).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    moveHomework(items, 'a', 1)
    expect(ids(items)).toEqual(['a', 'b', 'c'])
  })

  it('handles a single-item list', () => {
    const single = [hw({ id: 'only' })]
    expect(ids(moveHomework(single, 'only', 1))).toEqual(['only'])
    expect(ids(moveHomework(single, 'only', -1))).toEqual(['only'])
  })

  it('handles an empty list', () => {
    expect(moveHomework([], 'a', 1)).toEqual([])
  })
})

describe('moveHomeworkAmongVisible', () => {
  const visibleUnlessDone = (h: Homework) => !h.completed

  it('swaps with the adjacent VISIBLE item, skipping hidden ones', () => {
    // Stored order B, A(done→hidden), C. Moving B down should land it past C.
    const items = [hw({ id: 'b' }), hw({ id: 'a', completed: true }), hw({ id: 'c' })]
    expect(ids(moveHomeworkAmongVisible(items, 'b', 1, visibleUnlessDone))).toEqual(['c', 'a', 'b'])
  })

  it('moves up past a hidden item to the previous visible one', () => {
    const items = [hw({ id: 'a' }), hw({ id: 'x', completed: true }), hw({ id: 'c' })]
    expect(ids(moveHomeworkAmongVisible(items, 'c', -1, visibleUnlessDone))).toEqual([
      'c',
      'x',
      'a',
    ])
  })

  it('is a no-op when there is no further visible neighbor', () => {
    const items = [hw({ id: 'a' }), hw({ id: 'x', completed: true })]
    expect(ids(moveHomeworkAmongVisible(items, 'a', 1, visibleUnlessDone))).toEqual(['a', 'x'])
  })

  it('matches plain moveHomework when everything is visible', () => {
    const items = [hw({ id: 'a' }), hw({ id: 'b' }), hw({ id: 'c' })]
    expect(ids(moveHomeworkAmongVisible(items, 'a', 1, () => true))).toEqual(['b', 'a', 'c'])
  })
})

describe('nextLinkLabel', () => {
  it('returns "Link 1" when there are no links', () => {
    expect(nextLinkLabel([])).toBe('Link 1')
  })

  it('returns "Link 1" when no labels match the pattern', () => {
    expect(nextLinkLabel([link('Homework PDF'), link('Solutions')])).toBe('Link 1')
  })

  it('increments past the max existing number', () => {
    expect(nextLinkLabel([link('Link 1'), link('Link 2')])).toBe('Link 3')
  })

  it('uses max + 1 even with gaps in numbering', () => {
    expect(nextLinkLabel([link('Link 1'), link('Link 5')])).toBe('Link 6')
  })

  it('ignores non-matching labels mixed with matching ones', () => {
    expect(nextLinkLabel([link('Notes'), link('Link 3'), link('other')])).toBe('Link 4')
  })

  it('treats zero-padded numbers numerically', () => {
    expect(nextLinkLabel([link('Link 07')])).toBe('Link 8')
  })

  it('requires exact "Link N" format (case-sensitive, whole string)', () => {
    expect(
      nextLinkLabel([link('link 3'), link('Link3'), link('Link 3 extra'), link('My Link 9')]),
    ).toBe('Link 1')
  })

  it('is not confused by a later smaller number', () => {
    expect(nextLinkLabel([link('Link 10'), link('Link 2')])).toBe('Link 11')
  })
})

describe('dueBucket', () => {
  const today = new Date(2026, 6, 4) // 2026-07-04 local

  it('returns none when there is no due date', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '' }), today)).toBe('none')
  })

  it('returns none for an invalid due date string', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: 'garbage' }), today)).toBe('none')
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-13-45' }), today)).toBe('none')
  })

  it('returns overdue for past dates', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-03' }), today)).toBe('overdue')
    expect(dueBucket(hw({ id: 'a', dueDate: '2025-01-01' }), today)).toBe('overdue')
  })

  it('returns today for a due date of today', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-04' }), today)).toBe('today')
  })

  it('returns tomorrow at exactly 1 day out', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-05' }), today)).toBe('tomorrow')
  })

  it('returns soon at exactly 2 days out', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-06' }), today)).toBe('soon')
  })

  it('returns soon at exactly 7 days out', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-11' }), today)).toBe('soon')
  })

  it('returns later at exactly 8 days out', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-12' }), today)).toBe('later')
  })

  it('returns later far in the future', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2027-07-04' }), today)).toBe('later')
  })

  it('ignores the time of day on the reference date', () => {
    const lateToday = new Date(2026, 6, 4, 23, 59, 59)
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-05' }), lateToday)).toBe('tomorrow')
  })

  it('handles month boundaries', () => {
    const endOfMonth = new Date(2026, 0, 31)
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-02-01' }), endOfMonth)).toBe('tomorrow')
  })

  it('is independent of completion status', () => {
    expect(dueBucket(hw({ id: 'a', dueDate: '2026-07-01', completed: true }), today)).toBe(
      'overdue',
    )
  })
})

describe('isOverdue', () => {
  const today = new Date(2026, 6, 4)

  it('is true for an incomplete item due in the past', () => {
    expect(isOverdue(hw({ id: 'a', dueDate: '2026-07-03' }), today)).toBe(true)
  })

  it('is false for a completed item due in the past', () => {
    expect(isOverdue(hw({ id: 'a', dueDate: '2026-07-03', completed: true }), today)).toBe(false)
  })

  it('is false for an item due today', () => {
    expect(isOverdue(hw({ id: 'a', dueDate: '2026-07-04' }), today)).toBe(false)
  })

  it('is false for an item with no due date', () => {
    expect(isOverdue(hw({ id: 'a', dueDate: '' }), today)).toBe(false)
  })

  it('is false for a future due date', () => {
    expect(isOverdue(hw({ id: 'a', dueDate: '2026-08-01' }), today)).toBe(false)
  })
})

describe('homeworkProgress', () => {
  it('returns zeros for an empty list', () => {
    expect(homeworkProgress([])).toEqual({ done: 0, total: 0 })
  })

  it('counts completed items', () => {
    const items = [
      hw({ id: 'a', completed: true }),
      hw({ id: 'b', completed: false }),
      hw({ id: 'c', completed: true }),
    ]
    expect(homeworkProgress(items)).toEqual({ done: 2, total: 3 })
  })

  it('handles all-complete and none-complete', () => {
    expect(homeworkProgress([hw({ id: 'a', completed: true })])).toEqual({ done: 1, total: 1 })
    expect(homeworkProgress([hw({ id: 'a' })])).toEqual({ done: 0, total: 1 })
  })
})
