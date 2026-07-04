import { courseSchema, semesterSchema, type Semester } from '@/domain/model'
import { formatYmd } from '@/lib/dates'
import {
  EXAM_MAX_COLUMNS,
  EXAM_MODE_LEAD_DAYS,
  EXAM_NODE_TARGET_WIDTH,
  annotateExamStates,
  collectExams,
  computeExamColumns,
  cssColor,
  examProgress,
  formatCountdown,
  gapDays,
  getExamWindow,
  hideExam,
  isExamModeActiveByDate,
  layoutSerpentine,
  resolveExamViewMode,
  restoreExam,
  validateCustomExam,
  type AnnotatedExamNode,
  type ExamNode,
  type RoadmapCell,
} from './examMode'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCourse(
  id: string,
  name: string,
  moedA = '',
  moedB = '',
  color = 'hsl(200, 45%, 50%)',
) {
  return courseSchema.parse({ id, name, color, exams: { moedA, moedB } })
}

function makeSemester(over: Record<string, unknown> = {}): Semester {
  return semesterSchema.parse({ id: 's1', name: 'Spring 2026', ...over })
}

function bareNode(id: string, date: string, over: Partial<ExamNode> = {}): ExamNode {
  return {
    id,
    kind: 'course',
    courseId: 'c1',
    name: 'Calculus',
    label: 'Moed A',
    date,
    color: '#3b82f6',
    moed: 'A',
    ...over,
  }
}

/**
 * Builds `count` annotated nodes with triangular date offsets so the gap
 * between flow-consecutive nodes j and j+1 is exactly j+1 days (all distinct).
 */
function makeAnnotated(count: number): AnnotatedExamNode[] {
  return Array.from({ length: count }, (_, i) => {
    const offset = (i * (i + 1)) / 2
    return {
      id: `n${i}`,
      kind: 'course' as const,
      courseId: `c${i}`,
      name: `Course ${i}`,
      label: 'Moed A',
      date: formatYmd(new Date(2026, 1, 1 + offset)),
      color: '#3b82f6',
      moed: 'A' as const,
      state: 'upcoming' as const,
      isNext: i === 0,
      daysUntil: offset,
    }
  })
}

type NodeCell = Extract<RoadmapCell, { kind: 'node' }>
type TurnCell = Extract<RoadmapCell, { kind: 'turn' }>

function asNodeCell(cell: RoadmapCell | undefined): NodeCell {
  if (!cell || cell.kind !== 'node') throw new Error(`expected node cell, got ${cell?.kind}`)
  return cell
}

function asTurnCell(cell: RoadmapCell | undefined): TurnCell {
  if (!cell || cell.kind !== 'turn') throw new Error(`expected turn cell, got ${cell?.kind}`)
  return cell
}

function flowIndex(id: string): number {
  return Number(id.slice(1))
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('exports the legacy constants', () => {
    expect(EXAM_MODE_LEAD_DAYS).toBe(14)
    expect(EXAM_MAX_COLUMNS).toBe(6)
    expect(EXAM_NODE_TARGET_WIDTH).toBe(150)
  })
})

// ---------------------------------------------------------------------------
// collectExams
// ---------------------------------------------------------------------------

describe('collectExams', () => {
  it('builds course nodes from moed A/B dates with derived ids and labels', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Calculus', '2026-02-05', '2026-03-01')],
    })
    const nodes = collectExams(semester)
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toEqual({
      id: 'c1:A',
      kind: 'course',
      courseId: 'c1',
      name: 'Calculus',
      label: 'Moed A',
      date: '2026-02-05',
      color: 'hsl(200, 45%, 50%)',
      moed: 'A',
    })
    expect(nodes[1]).toMatchObject({ id: 'c1:B', label: 'Moed B', moed: 'B', date: '2026-03-01' })
  })

  it('skips empty and invalid (rollover) exam dates', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Calculus', '', '2026-02-31')],
      customExams: [{ id: 'x1', name: 'Workshop', label: '', date: '2026-02-30', color: '' }],
    })
    expect(collectExams(semester)).toEqual([])
  })

  it('maps custom exams with kind custom, null courseId/moed, and verbatim label/color', () => {
    const semester = makeSemester({
      customExams: [{ id: 'x1', name: 'GRE', label: '', date: '2026-02-05', color: '' }],
    })
    const nodes = collectExams(semester)
    expect(nodes).toEqual([
      {
        id: 'x1',
        kind: 'custom',
        courseId: null,
        name: 'GRE',
        label: '',
        date: '2026-02-05',
        color: '',
        moed: null,
      },
    ])
  })

  it('sorts ascending by date', () => {
    const semester = makeSemester({
      courses: [
        makeCourse('c1', 'Calculus', '2026-03-01', '2026-02-05'),
        makeCourse('c2', 'Physics', '2026-02-10'),
      ],
    })
    expect(collectExams(semester).map((n) => n.date)).toEqual([
      '2026-02-05',
      '2026-02-10',
      '2026-03-01',
    ])
  })

  it('breaks same-date ties with course exams before custom exams (even by name)', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Zebra Studies', '2026-02-10')],
      customExams: [{ id: 'x1', name: 'AAA Custom', label: '', date: '2026-02-10', color: '' }],
    })
    expect(collectExams(semester).map((n) => n.id)).toEqual(['c1:A', 'x1'])
  })

  it('breaks same-course same-date ties with Moed A before Moed B', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Calculus', '2026-02-15', '2026-02-15')],
    })
    expect(collectExams(semester).map((n) => n.id)).toEqual(['c1:A', 'c1:B'])
  })

  it('breaks remaining same-date ties by name', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Zeta', '2026-02-20'), makeCourse('c2', 'Alpha', '2026-02-20')],
    })
    expect(collectExams(semester).map((n) => n.name)).toEqual(['Alpha', 'Zeta'])
  })

  it('excludes hidden nodes by default and keeps them with includeHidden', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Calculus', '2026-02-05', '2026-02-10')],
      customExams: [{ id: 'x1', name: 'GRE', label: '', date: '2026-02-07', color: '' }],
      hiddenExamIds: ['c1:A', 'x1'],
    })
    expect(collectExams(semester).map((n) => n.id)).toEqual(['c1:B'])
    expect(collectExams(semester, { includeHidden: true }).map((n) => n.id)).toEqual([
      'c1:A',
      'x1',
      'c1:B',
    ])
  })

  it('filters by moed, excluding custom exams under A/B filters', () => {
    const semester = makeSemester({
      courses: [makeCourse('c1', 'Calculus', '2026-02-05', '2026-02-10')],
      customExams: [{ id: 'x1', name: 'GRE', label: '', date: '2026-02-07', color: '' }],
    })
    expect(collectExams(semester, { moedFilter: 'A' }).map((n) => n.id)).toEqual(['c1:A'])
    expect(collectExams(semester, { moedFilter: 'B' }).map((n) => n.id)).toEqual(['c1:B'])
    expect(collectExams(semester, { moedFilter: 'all' })).toHaveLength(3)
  })

  it('returns [] for a semester without exams', () => {
    expect(collectExams(makeSemester())).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getExamWindow
// ---------------------------------------------------------------------------

describe('getExamWindow', () => {
  it('returns null for empty input', () => {
    expect(getExamWindow([])).toBeNull()
  })

  it('returns min/max dates even for unsorted input', () => {
    const nodes = [
      bareNode('a', '2026-02-10'),
      bareNode('b', '2026-02-01'),
      bareNode('c', '2026-02-20'),
    ]
    expect(getExamWindow(nodes)).toEqual({ first: '2026-02-01', last: '2026-02-20' })
  })

  it('returns the same date as first and last for a single exam', () => {
    expect(getExamWindow([bareNode('a', '2026-02-10')])).toEqual({
      first: '2026-02-10',
      last: '2026-02-10',
    })
  })
})

// ---------------------------------------------------------------------------
// isExamModeActiveByDate
// ---------------------------------------------------------------------------

describe('isExamModeActiveByDate', () => {
  const nodes = [bareNode('a', '2026-02-01'), bareNode('b', '2026-02-20')]

  it('activates exactly EXAM_MODE_LEAD_DAYS before the first exam', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 0, 18))).toBe(true)
  })

  it('is inactive one day before the lead window opens', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 0, 17))).toBe(false)
  })

  it('is active on the last exam day (inclusive)', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 1, 20))).toBe(true)
  })

  it('is inactive one day after the last exam', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 1, 21))).toBe(false)
  })

  it('is active in the middle of the window', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 1, 10))).toBe(true)
  })

  it('uses calendar-day math regardless of time of day', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 0, 18, 23, 59))).toBe(true)
    expect(isExamModeActiveByDate(nodes, new Date(2026, 1, 20, 23, 59))).toBe(true)
  })

  it('returns false when there are no exams', () => {
    expect(isExamModeActiveByDate([], new Date(2026, 1, 10))).toBe(false)
  })

  it('honors a custom lead window', () => {
    expect(isExamModeActiveByDate(nodes, new Date(2026, 0, 31), 1)).toBe(true)
    expect(isExamModeActiveByDate(nodes, new Date(2026, 0, 30), 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolveExamViewMode
// ---------------------------------------------------------------------------

describe('resolveExamViewMode', () => {
  const inWindow = new Date(2026, 1, 10)
  const outOfWindow = new Date(2026, 5, 1)

  function semesterWithExam(examViewMode: string, hiddenExamIds: string[] = []): Semester {
    return makeSemester({
      courses: [makeCourse('c1', 'Calculus', '2026-02-05', '2026-02-20')],
      examViewMode,
      hiddenExamIds,
    })
  }

  it('honors a manual semester override even inside the exam window', () => {
    expect(resolveExamViewMode(semesterWithExam('semester'), inWindow)).toBe('semester')
  })

  it('honors a manual exam override even outside the exam window', () => {
    expect(resolveExamViewMode(semesterWithExam('exam'), outOfWindow)).toBe('exam')
  })

  it('auto-activates by date when mode is auto', () => {
    expect(resolveExamViewMode(semesterWithExam('auto'), inWindow)).toBe('exam')
    expect(resolveExamViewMode(semesterWithExam('auto'), outOfWindow)).toBe('semester')
  })

  it('ignores hidden exams when deciding automatically', () => {
    const semester = semesterWithExam('auto', ['c1:A', 'c1:B'])
    expect(resolveExamViewMode(semester, inWindow)).toBe('semester')
  })

  it('resolves to semester when there are no exams at all', () => {
    expect(resolveExamViewMode(makeSemester(), inWindow)).toBe('semester')
  })
})

// ---------------------------------------------------------------------------
// annotateExamStates
// ---------------------------------------------------------------------------

describe('annotateExamStates', () => {
  const today = new Date(2026, 1, 10)

  it('assigns passed/today/upcoming states with signed daysUntil', () => {
    const nodes = [
      bareNode('a', '2026-02-08'),
      bareNode('b', '2026-02-10'),
      bareNode('c', '2026-02-12'),
    ]
    const annotated = annotateExamStates(nodes, today)
    expect(annotated.map((n) => n.state)).toEqual(['passed', 'today', 'upcoming'])
    expect(annotated.map((n) => n.daysUntil)).toEqual([-2, 0, 2])
  })

  it('marks exactly one node as next: the first non-passed node', () => {
    const nodes = [
      bareNode('a', '2026-02-08'),
      bareNode('b', '2026-02-10'),
      bareNode('c', '2026-02-12'),
    ]
    const annotated = annotateExamStates(nodes, today)
    expect(annotated.map((n) => n.isNext)).toEqual([false, true, false])
    expect(annotated.filter((n) => n.isNext)).toHaveLength(1)
  })

  it('picks the first upcoming node as next when nothing is today', () => {
    const nodes = [bareNode('a', '2026-02-01'), bareNode('b', '2026-02-15')]
    const annotated = annotateExamStates(nodes, today)
    expect(annotated.map((n) => n.isNext)).toEqual([false, true])
  })

  it('marks no node as next when all exams have passed', () => {
    const nodes = [bareNode('a', '2026-02-01'), bareNode('b', '2026-02-05')]
    const annotated = annotateExamStates(nodes, today)
    expect(annotated.every((n) => n.state === 'passed')).toBe(true)
    expect(annotated.some((n) => n.isNext)).toBe(false)
  })

  it('treats an unparseable date as upcoming with NaN daysUntil (legacy behavior)', () => {
    const annotated = annotateExamStates([bareNode('a', '')], today)
    expect(annotated[0]?.state).toBe('upcoming')
    expect(Number.isNaN(annotated[0]?.daysUntil)).toBe(true)
    expect(annotated[0]?.isNext).toBe(true)
  })

  it('does not mutate the input nodes', () => {
    const node = bareNode('a', '2026-02-12')
    annotateExamStates([node], today)
    expect(node).toEqual(bareNode('a', '2026-02-12'))
  })
})

// ---------------------------------------------------------------------------
// formatCountdown
// ---------------------------------------------------------------------------

describe('formatCountdown', () => {
  it('formats today, tomorrow, future and past day counts', () => {
    expect(formatCountdown(0)).toBe('Today')
    expect(formatCountdown(1)).toBe('Tomorrow')
    expect(formatCountdown(2)).toBe('in 2 days')
    expect(formatCountdown(14)).toBe('in 14 days')
    expect(formatCountdown(-1)).toBe('1 days ago')
    expect(formatCountdown(-7)).toBe('7 days ago')
  })
})

// ---------------------------------------------------------------------------
// gapDays
// ---------------------------------------------------------------------------

describe('gapDays', () => {
  it('returns absolute calendar days between two exams, in either order', () => {
    const a = bareNode('a', '2026-02-01')
    const b = bareNode('b', '2026-02-05')
    expect(gapDays(a, b)).toBe(4)
    expect(gapDays(b, a)).toBe(4)
  })

  it('returns 0 for same-day exams', () => {
    expect(gapDays(bareNode('a', '2026-02-01'), bareNode('b', '2026-02-01'))).toBe(0)
  })

  it('returns 0 when a date is unparseable', () => {
    expect(gapDays(bareNode('a', ''), bareNode('b', '2026-02-01'))).toBe(0)
    expect(gapDays(bareNode('a', '2026-02-01'), bareNode('b', 'nope'))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// examProgress
// ---------------------------------------------------------------------------

describe('examProgress', () => {
  function annotated(states: Array<'passed' | 'today' | 'upcoming'>): AnnotatedExamNode[] {
    return states.map((state, i) => ({
      ...bareNode(`n${i}`, '2026-02-01'),
      state,
      isNext: false,
      daysUntil: 0,
    }))
  }

  it('counts passed exams and rounds the percentage', () => {
    expect(examProgress(annotated(['passed', 'passed', 'upcoming']))).toEqual({
      done: 2,
      total: 3,
      pct: 67,
    })
    expect(examProgress(annotated(['passed', 'upcoming', 'upcoming']))).toEqual({
      done: 1,
      total: 3,
      pct: 33,
    })
  })

  it('handles the empty and all-done cases', () => {
    expect(examProgress([])).toEqual({ done: 0, total: 0, pct: 0 })
    expect(examProgress(annotated(['passed', 'passed']))).toEqual({ done: 2, total: 2, pct: 100 })
  })

  it('does not count today as done', () => {
    expect(examProgress(annotated(['today', 'upcoming']))).toEqual({ done: 0, total: 2, pct: 0 })
  })
})

// ---------------------------------------------------------------------------
// computeExamColumns
// ---------------------------------------------------------------------------

describe('computeExamColumns', () => {
  it('targets ~150px per node at narrow widths', () => {
    expect(computeExamColumns(320, 1)).toBe(1)
    expect(computeExamColumns(320, 3)).toBe(2)
    expect(computeExamColumns(320, 10)).toBe(2)
  })

  it('targets ~150px per node at tablet widths', () => {
    expect(computeExamColumns(768, 1)).toBe(1)
    expect(computeExamColumns(768, 3)).toBe(3)
    expect(computeExamColumns(768, 10)).toBe(5)
  })

  it('caps at EXAM_MAX_COLUMNS at desktop widths', () => {
    expect(computeExamColumns(1200, 1)).toBe(1)
    expect(computeExamColumns(1200, 3)).toBe(3)
    expect(computeExamColumns(1200, 10)).toBe(6)
  })

  it('falls back to the count-based maximum when width is unknown', () => {
    expect(computeExamColumns(0, 5)).toBe(5)
    expect(computeExamColumns(0, 10)).toBe(6)
    expect(computeExamColumns(-5, 3)).toBe(3)
  })

  it('never returns less than 1 column', () => {
    expect(computeExamColumns(100, 5)).toBe(1)
    expect(computeExamColumns(500, 0)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// layoutSerpentine
// ---------------------------------------------------------------------------

describe('layoutSerpentine', () => {
  it('returns an empty matrix for no nodes', () => {
    expect(layoutSerpentine([], 3)).toEqual([])
  })

  it('clamps cols to at least 1', () => {
    const grid = layoutSerpentine(makeAnnotated(2), 0)
    expect(grid).toHaveLength(3)
    for (const row of grid) expect(row).toHaveLength(1)
  })

  it('lays out n=5 cols=3 exactly like the legacy serpentine', () => {
    const nodes = makeAnnotated(5)
    const grid = layoutSerpentine(nodes, 3)
    expect(grid).toHaveLength(3)

    // Row 0: n0 -> n1 -> n2 left-to-right, connected, with gaps 1 and 2.
    const r0 = grid[0]!
    expect(asNodeCell(r0[0])).toMatchObject({
      connectLeft: false,
      connectRight: true,
      gapAfter: 1,
    })
    expect(asNodeCell(r0[0]).node.id).toBe('n0')
    expect(asNodeCell(r0[1])).toMatchObject({ connectLeft: true, connectRight: true, gapAfter: 2 })
    expect(asNodeCell(r0[2])).toMatchObject({
      connectLeft: true,
      connectRight: false,
      gapAfter: null,
    })
    expect(asNodeCell(r0[2]).node.id).toBe('n2')

    // Row 1: turn on the right (row 0 ends right), gap n2->n3 = 3.
    const r1 = grid[1]!
    expect(r1[0]?.kind).toBe('spacer')
    expect(r1[1]?.kind).toBe('spacer')
    expect(asTurnCell(r1[2])).toEqual({ kind: 'turn', gapAfter: 3, side: 'right' })

    // Row 2: reversed, padded with a spacer on the LEFT; display order n4, n3.
    const r2 = grid[2]!
    expect(r2[0]?.kind).toBe('spacer')
    expect(asNodeCell(r2[1])).toMatchObject({ connectLeft: false, connectRight: true, gapAfter: 4 })
    expect(asNodeCell(r2[1]).node.id).toBe('n4')
    expect(asNodeCell(r2[2])).toMatchObject({
      connectLeft: true,
      connectRight: false,
      gapAfter: null,
    })
    expect(asNodeCell(r2[2]).node.id).toBe('n3')
  })

  it('places the turn on the left after a reversed row (n=7 cols=3)', () => {
    const grid = layoutSerpentine(makeAnnotated(7), 3)
    expect(grid).toHaveLength(5)
    // Row 3 is the turn row after reversed row 1 (flow n3..n5, displayed n5..n3).
    const turnRow = grid[3]!
    expect(asTurnCell(turnRow[0])).toEqual({ kind: 'turn', gapAfter: 6, side: 'left' })
    expect(turnRow[1]?.kind).toBe('spacer')
    expect(turnRow[2]?.kind).toBe('spacer')
    // Row 4 restarts left-to-right with n6 in the leftmost column.
    const lastRow = grid[4]!
    expect(asNodeCell(lastRow[0]).node.id).toBe('n6')
    expect(asNodeCell(lastRow[0])).toMatchObject({
      connectLeft: false,
      connectRight: false,
      gapAfter: null,
    })
    expect(lastRow[1]?.kind).toBe('spacer')
    expect(lastRow[2]?.kind).toBe('spacer')
  })

  // Exhaustive shape invariants over n=1..13 x cols=1..6.
  for (let n = 1; n <= 13; n++) {
    for (let cols = 1; cols <= 6; cols++) {
      it(`satisfies the serpentine invariants for n=${n} cols=${cols}`, () => {
        const nodes = makeAnnotated(n)
        const grid = layoutSerpentine(nodes, cols)
        const nodeRowCount = Math.ceil(n / cols)

        // Node rows at even indices, turn rows interleaved at odd indices.
        expect(grid).toHaveLength(2 * nodeRowCount - 1)
        for (const row of grid) expect(row).toHaveLength(cols)

        for (let k = 0; k < nodeRowCount; k++) {
          const row = grid[2 * k]!
          const chunk = nodes.slice(k * cols, (k + 1) * cols)
          const reverse = k % 2 === 1
          const padCount = cols - chunk.length

          expect(row.some((cell) => cell.kind === 'turn')).toBe(false)
          expect(row.filter((cell) => cell.kind === 'node')).toHaveLength(chunk.length)
          expect(row.filter((cell) => cell.kind === 'spacer')).toHaveLength(padCount)

          // Spacer padding hugs the flow's trailing side.
          for (let i = 0; i < padCount; i++) {
            const idx = reverse ? i : cols - 1 - i
            expect(row[idx]?.kind).toBe('spacer')
          }

          // Display order: reversed rows show the chunk right-to-left.
          const displayedIds = row
            .filter((cell): cell is NodeCell => cell.kind === 'node')
            .map((cell) => cell.node.id)
          const expectedIds = (reverse ? [...chunk].reverse() : chunk).map((nd) => nd.id)
          expect(displayedIds).toEqual(expectedIds)

          // Connector flags and gap propagation between display-adjacent nodes.
          row.forEach((cell, i) => {
            if (cell.kind !== 'node') return
            const left = i > 0 ? row[i - 1] : undefined
            const right = i < cols - 1 ? row[i + 1] : undefined
            expect(cell.connectLeft).toBe(left?.kind === 'node')
            expect(cell.connectRight).toBe(right?.kind === 'node')
            if (right?.kind === 'node') {
              const ja = flowIndex(cell.node.id)
              const jb = flowIndex(right.node.id)
              expect(Math.abs(ja - jb)).toBe(1)
              // Triangular dates: the gap between flow nodes j and j+1 is j+1.
              expect(cell.gapAfter).toBe(Math.max(ja, jb))
            } else {
              expect(cell.gapAfter).toBeNull()
            }
          })
        }

        // Turn rows: single turn cell on the completed row's end side.
        for (let k = 0; k < nodeRowCount - 1; k++) {
          const row = grid[2 * k + 1]!
          const side = k % 2 === 1 ? 'left' : 'right'
          const turnIndex = side === 'right' ? cols - 1 : 0
          row.forEach((cell, i) => {
            if (i === turnIndex) {
              const turn = asTurnCell(cell)
              expect(turn.side).toBe(side)
              // Gap between the flow-last node of row k and flow-first of row k+1.
              expect(turn.gapAfter).toBe((k + 1) * cols)
            } else {
              expect(cell.kind).toBe('spacer')
            }
          })
        }

        // Reading the board serpentine-wise reconstructs the sorted flow order.
        const readBack: string[] = []
        for (let k = 0; k < nodeRowCount; k++) {
          const ids = grid[2 * k]!.filter((cell): cell is NodeCell => cell.kind === 'node').map(
            (cell) => cell.node.id,
          )
          if (k % 2 === 1) ids.reverse()
          readBack.push(...ids)
        }
        expect(readBack).toEqual(nodes.map((nd) => nd.id))
      })
    }
  }
})

// ---------------------------------------------------------------------------
// validateCustomExam
// ---------------------------------------------------------------------------

describe('validateCustomExam', () => {
  it('accepts a valid exam, with an optional empty label', () => {
    expect(validateCustomExam({ name: 'Final', label: '', date: '2026-02-10' })).toEqual({
      valid: true,
      errors: {},
    })
    expect(validateCustomExam({ name: 'Final', label: 'Retake', date: '2026-02-10' })).toEqual({
      valid: true,
      errors: {},
    })
  })

  it('requires a non-blank name', () => {
    expect(validateCustomExam({ name: '', label: '', date: '2026-02-10' })).toMatchObject({
      valid: false,
    })
    const blank = validateCustomExam({ name: '   ', label: '', date: '2026-02-10' })
    expect(blank.valid).toBe(false)
    expect(blank.errors.name).toBeDefined()
    expect(blank.errors.label).toBeUndefined()
    expect(blank.errors.date).toBeUndefined()
  })

  it('rejects names longer than 100 characters but accepts exactly 100', () => {
    expect(validateCustomExam({ name: 'a'.repeat(100), label: '', date: '2026-02-10' }).valid).toBe(
      true,
    )
    const result = validateCustomExam({ name: 'a'.repeat(101), label: '', date: '2026-02-10' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('rejects labels longer than 30 characters but accepts exactly 30', () => {
    expect(
      validateCustomExam({ name: 'Final', label: 'b'.repeat(30), date: '2026-02-10' }).valid,
    ).toBe(true)
    const result = validateCustomExam({ name: 'Final', label: 'b'.repeat(31), date: '2026-02-10' })
    expect(result.valid).toBe(false)
    expect(result.errors.label).toBeDefined()
  })

  it('requires a valid calendar date', () => {
    for (const date of ['', '10-02-2026', '2026-2-1', '2026-02-30', 'nonsense']) {
      const result = validateCustomExam({ name: 'Final', label: '', date })
      expect(result.valid).toBe(false)
      expect(result.errors.date).toBeDefined()
    }
  })

  it('reports all field errors at once', () => {
    const result = validateCustomExam({ name: '', label: 'b'.repeat(31), date: 'bad' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
    expect(result.errors.label).toBeDefined()
    expect(result.errors.date).toBeDefined()
  })

  it('trims name and date before validating', () => {
    expect(validateCustomExam({ name: '  Final  ', label: '', date: ' 2026-02-10 ' }).valid).toBe(
      true,
    )
  })
})

// ---------------------------------------------------------------------------
// cssColor
// ---------------------------------------------------------------------------

describe('cssColor', () => {
  it('allows hex colors of 3-8 digits', () => {
    expect(cssColor('#fff')).toBe('#fff')
    expect(cssColor('#3b82f6')).toBe('#3b82f6')
    expect(cssColor('#12345678')).toBe('#12345678')
    expect(cssColor('#ggg')).toBe('var(--accent)')
    expect(cssColor('#ff')).toBe('var(--accent)')
  })

  it('allows hsl/hsla colors', () => {
    expect(cssColor('hsl(200, 45%, 50%)')).toBe('hsl(200, 45%, 50%)')
    expect(cssColor('hsl(200,45%,50%)')).toBe('hsl(200,45%,50%)')
    expect(cssColor('hsla(200, 45%, 50%, 0.5)')).toBe('hsla(200, 45%, 50%, 0.5)')
    expect(cssColor('hsl(200, 45, 50)')).toBe('var(--accent)')
  })

  it('allows rgb/rgba colors', () => {
    expect(cssColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
    expect(cssColor('rgba(1, 2, 3, 0.5)')).toBe('rgba(1, 2, 3, 0.5)')
    expect(cssColor('rgb(1, 2, evil)')).toBe('var(--accent)')
  })

  it('allows bare color names and trims whitespace', () => {
    expect(cssColor('red')).toBe('red')
    expect(cssColor('RebeccaPurple')).toBe('RebeccaPurple')
    expect(cssColor('  #fff  ')).toBe('#fff')
  })

  it('blocks CSS/JS injection attempts', () => {
    expect(cssColor('javascript:alert(1)')).toBe('var(--accent)')
    expect(cssColor('url(evil.png)')).toBe('var(--accent)')
    expect(cssColor('red; background: url(x)')).toBe('var(--accent)')
    expect(cssColor('hsl(200, 45%, 50%); background: url(x)')).toBe('var(--accent)')
    expect(cssColor('expression(alert(1))')).toBe('var(--accent)')
  })

  it('falls back for empty strings', () => {
    expect(cssColor('')).toBe('var(--accent)')
    expect(cssColor('   ')).toBe('var(--accent)')
  })
})

// ---------------------------------------------------------------------------
// hideExam / restoreExam
// ---------------------------------------------------------------------------

describe('hideExam / restoreExam', () => {
  it('appends a new id without mutating the input', () => {
    const input = ['a']
    const result = hideExam(input, 'b')
    expect(result).toEqual(['a', 'b'])
    expect(input).toEqual(['a'])
  })

  it('does not duplicate an already-hidden id', () => {
    const input = ['a']
    const result = hideExam(input, 'a')
    expect(result).toEqual(['a'])
    expect(result).not.toBe(input)
  })

  it('ignores an empty node id', () => {
    expect(hideExam(['a'], '')).toEqual(['a'])
  })

  it('removes an id on restore without mutating the input', () => {
    const input = ['a', 'b', 'c']
    expect(restoreExam(input, 'b')).toEqual(['a', 'c'])
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('is a no-op when restoring an id that is not hidden', () => {
    expect(restoreExam(['a'], 'x')).toEqual(['a'])
    expect(restoreExam([], 'x')).toEqual([])
  })
})
