import type { RecordingItem, RecordingTab } from '@/domain/model'
import {
  extractNumber,
  sortRecordings,
  moveRecording,
  generateRecordingName,
  recordingsProgress,
  canDeleteTab,
  canRenameTab,
  newCustomTabId,
} from '@/domain/recordings'

function rec(overrides: Partial<RecordingItem> & { id: string }): RecordingItem {
  return {
    name: overrides.id,
    videoLink: '',
    slideLink: '',
    watched: false,
    ...overrides,
  }
}

function tab(items: RecordingItem[]): RecordingTab {
  return { id: 'lectures', name: 'Lectures', items }
}

const ids = (items: readonly RecordingItem[]) => items.map((item) => item.id)

describe('extractNumber', () => {
  it('extracts a single trailing number', () => {
    expect(extractNumber('Lecture 12')).toBe(12)
    expect(extractNumber('Recording 5')).toBe(5)
  })

  it('uses the LAST group of digits', () => {
    expect(extractNumber('Lecture 12 part 2')).toBe(2)
    expect(extractNumber('1 of 10')).toBe(10)
  })

  it('parses zero-padded numbers', () => {
    expect(extractNumber('Video 007')).toBe(7)
  })

  it('handles numbers embedded without spaces', () => {
    expect(extractNumber('a1b2c3')).toBe(3)
    expect(extractNumber('Lecture12')).toBe(12)
  })

  it('returns null when there are no digits', () => {
    expect(extractNumber('Introduction')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractNumber('')).toBeNull()
  })

  it('handles a purely numeric name', () => {
    expect(extractNumber('42')).toBe(42)
  })
})

describe('sortRecordings', () => {
  it('returns a new array and does not mutate the input', () => {
    const items = [rec({ id: 'b', name: 'Lecture 2' }), rec({ id: 'a', name: 'Lecture 1' })]
    const sorted = sortRecordings(items, 'default')
    expect(sorted).not.toBe(items)
    expect(ids(items)).toEqual(['b', 'a'])
    expect(ids(sorted)).toEqual(['a', 'b'])
  })

  it('returns an empty array for empty input', () => {
    expect(sortRecordings([], 'default')).toEqual([])
  })

  describe('default (natural numeric)', () => {
    it('sorts numerically, not lexically', () => {
      const items = [
        rec({ id: 'a', name: 'Recording 12' }),
        rec({ id: 'b', name: 'Recording 5' }),
        rec({ id: 'c', name: 'Recording 100' }),
      ]
      expect(ids(sortRecordings(items, 'default'))).toEqual(['b', 'a', 'c'])
    })

    it('puts items without a number after items with numbers', () => {
      const items = [
        rec({ id: 'intro', name: 'Introduction' }),
        rec({ id: 'a', name: 'Lecture 2' }),
        rec({ id: 'b', name: 'Lecture 1' }),
      ]
      expect(ids(sortRecordings(items, 'default'))).toEqual(['b', 'a', 'intro'])
    })

    it('breaks numeric ties alphabetically (case-insensitive)', () => {
      const items = [rec({ id: 'b', name: 'Banana 1' }), rec({ id: 'a', name: 'apple 1' })]
      expect(ids(sortRecordings(items, 'default'))).toEqual(['a', 'b'])
    })

    it('sorts items with no numbers alphabetically among themselves', () => {
      const items = [
        rec({ id: 'z', name: 'zeta' }),
        rec({ id: 'a', name: 'Alpha' }),
        rec({ id: 'm', name: 'mid' }),
      ]
      expect(ids(sortRecordings(items, 'default'))).toEqual(['a', 'm', 'z'])
    })

    it('uses the LAST digit group for ordering', () => {
      const items = [
        rec({ id: 'p2', name: 'Lecture 12 part 2' }),
        rec({ id: 'p1', name: 'Lecture 12 part 1' }),
      ]
      expect(ids(sortRecordings(items, 'default'))).toEqual(['p1', 'p2'])
    })
  })

  describe('name_asc / name_desc', () => {
    const items = [
      rec({ id: '1', name: 'gamma' }),
      rec({ id: '2', name: 'Alpha' }),
      rec({ id: '3', name: 'beta' }),
    ]

    it('name_asc sorts by name ascending (localeCompare)', () => {
      expect(ids(sortRecordings(items, 'name_asc'))).toEqual(['2', '3', '1'])
    })

    it('name_desc sorts by name descending', () => {
      expect(ids(sortRecordings(items, 'name_desc'))).toEqual(['1', '3', '2'])
    })
  })

  describe('watched_first / unwatched_first', () => {
    const items = [
      rec({ id: 'a', watched: false }),
      rec({ id: 'b', watched: true }),
      rec({ id: 'c', watched: false }),
      rec({ id: 'd', watched: true }),
    ]

    it('watched_first puts watched items first, stable by original index', () => {
      expect(ids(sortRecordings(items, 'watched_first'))).toEqual(['b', 'd', 'a', 'c'])
    })

    it('unwatched_first puts unwatched items first, stable by original index', () => {
      expect(ids(sortRecordings(items, 'unwatched_first'))).toEqual(['a', 'c', 'b', 'd'])
    })
  })

  describe('manual', () => {
    it('keeps the original order but returns a copy', () => {
      const items = [rec({ id: 'z', name: 'z 9' }), rec({ id: 'a', name: 'a 1' })]
      const sorted = sortRecordings(items, 'manual')
      expect(ids(sorted)).toEqual(['z', 'a'])
      expect(sorted).not.toBe(items)
    })
  })
})

describe('moveRecording', () => {
  const items = [rec({ id: 'a' }), rec({ id: 'b' }), rec({ id: 'c' })]

  it('moves an item down by swapping with the next item', () => {
    expect(ids(moveRecording(items, 'b', 1))).toEqual(['a', 'c', 'b'])
  })

  it('moves an item up by swapping with the previous item', () => {
    expect(ids(moveRecording(items, 'b', -1))).toEqual(['b', 'a', 'c'])
  })

  it('is a no-op (same order copy) at the top boundary', () => {
    const result = moveRecording(items, 'a', -1)
    expect(ids(result)).toEqual(['a', 'b', 'c'])
    expect(result).not.toBe(items)
  })

  it('is a no-op at the bottom boundary', () => {
    expect(ids(moveRecording(items, 'c', 1))).toEqual(['a', 'b', 'c'])
  })

  it('is a no-op for an unknown id', () => {
    expect(ids(moveRecording(items, 'missing', -1))).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    moveRecording(items, 'b', 1)
    expect(ids(items)).toEqual(['a', 'b', 'c'])
  })

  it('handles an empty list', () => {
    expect(moveRecording([], 'a', 1)).toEqual([])
  })
})

describe('generateRecordingName', () => {
  it('names YouTube links "Video N"', () => {
    expect(generateRecordingName('Lectures', 'https://www.youtube.com/watch?v=abc', 0)).toBe(
      'Video 1',
    )
    expect(generateRecordingName('Tutorials', 'https://youtu.be/abc', 4)).toBe('Video 5')
  })

  it('names Panopto links "Recording N"', () => {
    expect(
      generateRecordingName(
        'Lectures',
        'https://technion.panopto.com/Panopto/Pages/Viewer.aspx',
        2,
      ),
    ).toBe('Recording 3')
  })

  it('detects Panopto case-insensitively', () => {
    expect(generateRecordingName('Lectures', 'https://x.PANOPTO.com/v', 0)).toBe('Recording 1')
  })

  it('singularizes the tab name for other links', () => {
    expect(generateRecordingName('Lectures', 'https://moodle.technion.ac.il/file', 0)).toBe(
      'Lecture 1',
    )
    expect(generateRecordingName('Tutorials', 'https://example.com/video', 2)).toBe('Tutorial 3')
  })

  it('leaves tab names without a trailing "s" unchanged', () => {
    expect(generateRecordingName('Misc', 'https://example.com', 0)).toBe('Misc 1')
  })

  it('strips only ONE trailing "s"', () => {
    expect(generateRecordingName('Quizzes', 'https://example.com', 0)).toBe('Quizze 1')
  })

  it('uses the tab name for an empty link', () => {
    expect(generateRecordingName('Labs', '', 1)).toBe('Lab 2')
  })

  it('numbers as existingCount + 1', () => {
    expect(generateRecordingName('Lectures', 'https://youtube.com/watch?v=x', 11)).toBe('Video 12')
  })
})

describe('recordingsProgress', () => {
  it('returns zeros for an empty tab', () => {
    expect(recordingsProgress(tab([]))).toEqual({ done: 0, total: 0 })
  })

  it('counts watched items', () => {
    const t = tab([
      rec({ id: 'a', watched: true }),
      rec({ id: 'b', watched: false }),
      rec({ id: 'c', watched: true }),
    ])
    expect(recordingsProgress(t)).toEqual({ done: 2, total: 3 })
  })

  it('handles all watched', () => {
    expect(recordingsProgress(tab([rec({ id: 'a', watched: true })]))).toEqual({
      done: 1,
      total: 1,
    })
  })
})

describe('canDeleteTab / canRenameTab', () => {
  it('protects the built-in lectures and tutorials tabs', () => {
    expect(canDeleteTab('lectures')).toBe(false)
    expect(canDeleteTab('tutorials')).toBe(false)
    expect(canRenameTab('lectures')).toBe(false)
    expect(canRenameTab('tutorials')).toBe(false)
  })

  it('allows custom tabs', () => {
    expect(canDeleteTab('custom_abc123')).toBe(true)
    expect(canRenameTab('custom_abc123')).toBe(true)
  })

  it('is case-sensitive about protected ids', () => {
    expect(canDeleteTab('Lectures')).toBe(true)
    expect(canRenameTab('TUTORIALS')).toBe(true)
  })
})

describe('newCustomTabId', () => {
  it('prefixes ids with custom_', () => {
    expect(newCustomTabId()).toMatch(/^custom_/)
  })

  it('generates unique ids', () => {
    const a = newCustomTabId()
    const b = newCustomTabId()
    expect(a).not.toBe(b)
  })

  it('is never a protected tab id', () => {
    const id = newCustomTabId()
    expect(canDeleteTab(id)).toBe(true)
    expect(canRenameTab(id)).toBe(true)
  })
})
