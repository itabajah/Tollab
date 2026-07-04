import { examNodeId, type Moed } from '@/domain/ids'
import { VALIDATION_LIMITS, type Semester } from '@/domain/model'
import { daysBetween, daysUntil as ymdDaysUntil, parseYmd } from '@/lib/dates'

/**
 * Exam Mode domain logic: the serpentine "exam roadmap" that replaces the
 * weekly schedule during the exam period.
 *
 * The roadmap auto-activates when today falls inside the exam window
 * (firstExam - EXAM_MODE_LEAD_DAYS .. lastExam, inclusive), with a manual
 * per-semester override (examViewMode: 'auto' | 'semester' | 'exam'). Nodes
 * are derived from each course's Moed A/B dates plus user-defined custom
 * exams, sorted ascending by date. Ported 1:1 from the legacy exam-mode.js;
 * rendering is left to React, so DOM building is replaced by a pure cell
 * matrix (see layoutSerpentine).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Days before the first exam that Exam Mode auto-activates. */
export const EXAM_MODE_LEAD_DAYS = 14

/** Maximum number of columns in the serpentine layout. */
export const EXAM_MAX_COLUMNS = 6

/** Target width (px) per roadmap node, used to compute responsive columns. */
export const EXAM_NODE_TARGET_WIDTH = 150

// ---------------------------------------------------------------------------
// Exam collection & sort
// ---------------------------------------------------------------------------

export type MoedFilter = 'all' | 'A' | 'B'

export interface ExamNode {
  /** `courseId:moed` for course exams, the custom exam's own id otherwise. */
  id: string
  kind: 'course' | 'custom'
  courseId: string | null
  name: string
  /** 'Moed A' / 'Moed B' for course exams; the user's label (may be '') for custom. */
  label: string
  /** Valid YYYY-MM-DD (invalid dates never produce nodes). */
  date: string
  /** Course color, or the custom exam's color ('' lets the renderer fall back). */
  color: string
  moed: Moed | null
}

export interface CollectExamsOptions {
  moedFilter?: MoedFilter
  includeHidden?: boolean
}

/**
 * Legacy sort: ascending by date; same date puts course exams before custom,
 * Moed A before Moed B within one course, then falls back to name order.
 */
function compareExamNodes(a: ExamNode, b: ExamNode): number {
  // Valid ymd strings compare lexicographically in chronological order.
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  if (a.kind !== b.kind) return a.kind === 'custom' ? 1 : -1
  if (a.kind === 'course' && a.courseId === b.courseId && a.moed !== b.moed) {
    return a.moed === 'A' ? -1 : 1
  }
  return a.name.localeCompare(b.name)
}

/**
 * Collects all exam nodes for a semester (course Moed A/B + custom exams),
 * skipping empty/invalid dates, excluding `semester.hiddenExamIds` (unless
 * `includeHidden`), optionally filtering by moed (custom exams only match
 * 'all'), and sorting ascending by date with legacy tie-breaks.
 */
export function collectExams(semester: Semester, opts: CollectExamsOptions = {}): ExamNode[] {
  const includeHidden = opts.includeHidden === true
  const moedFilter = opts.moedFilter ?? 'all'
  const hidden = new Set(semester.hiddenExamIds)
  const nodes: ExamNode[] = []

  for (const course of semester.courses) {
    const moeds: Array<[Moed, string]> = [
      ['A', course.exams.moedA],
      ['B', course.exams.moedB],
    ]
    for (const [moed, date] of moeds) {
      if (!parseYmd(date)) continue
      const id = examNodeId(course.id, moed)
      if (hidden.has(id) && !includeHidden) continue
      nodes.push({
        id,
        kind: 'course',
        courseId: course.id,
        name: course.name,
        label: `Moed ${moed}`,
        date,
        color: course.color,
        moed,
      })
    }
  }

  for (const exam of semester.customExams) {
    if (!parseYmd(exam.date)) continue
    if (hidden.has(exam.id) && !includeHidden) continue
    nodes.push({
      id: exam.id,
      kind: 'custom',
      courseId: null,
      name: exam.name,
      label: exam.label,
      date: exam.date,
      color: exam.color,
      moed: null,
    })
  }

  nodes.sort(compareExamNodes)

  if (moedFilter === 'all') return nodes
  return nodes.filter((node) => node.moed === moedFilter)
}

// ---------------------------------------------------------------------------
// View-mode decision
// ---------------------------------------------------------------------------

/** Returns the min/max exam dates, or null when there are no exams. */
export function getExamWindow(nodes: readonly ExamNode[]): { first: string; last: string } | null {
  const head = nodes[0]
  if (!head) return null
  let first = head.date
  let last = head.date
  for (const node of nodes) {
    if (node.date < first) first = node.date
    if (node.date > last) last = node.date
  }
  return { first, last }
}

/**
 * Whether Exam Mode should auto-activate: true when
 * firstExam - leadDays <= today <= lastExam (inclusive, calendar-day math).
 */
export function isExamModeActiveByDate(
  nodes: readonly ExamNode[],
  today: Date,
  leadDays: number = EXAM_MODE_LEAD_DAYS,
): boolean {
  const win = getExamWindow(nodes)
  if (!win) return false
  const first = parseYmd(win.first)
  const last = parseYmd(win.last)
  if (!first || !last) return false
  return daysBetween(today, first) <= leadDays && daysBetween(today, last) >= 0
}

/**
 * Resolves the effective view for a semester: a manual override
 * ('semester'/'exam') wins; 'auto' decides by date using all non-hidden exams.
 */
export function resolveExamViewMode(semester: Semester, today: Date): 'semester' | 'exam' {
  if (semester.examViewMode === 'exam') return 'exam'
  if (semester.examViewMode === 'semester') return 'semester'
  return isExamModeActiveByDate(collectExams(semester), today) ? 'exam' : 'semester'
}

// ---------------------------------------------------------------------------
// State annotation
// ---------------------------------------------------------------------------

export type ExamNodeState = 'passed' | 'today' | 'upcoming'

export interface AnnotatedExamNode extends ExamNode {
  state: ExamNodeState
  /** True on exactly one node: the first that has not passed. */
  isNext: boolean
  /** Signed calendar days from today (negative = passed, NaN = unparseable). */
  daysUntil: number
}

/**
 * Annotates sorted nodes with a lifecycle state derived from daysUntil
 * (<0 passed, 0 today, >0 upcoming) and marks the single "next" exam.
 */
export function annotateExamStates(nodes: readonly ExamNode[], today: Date): AnnotatedExamNode[] {
  let nextAssigned = false
  return nodes.map((node) => {
    // NaN comparisons are all false, so an unparseable date lands in
    // 'upcoming' — matching the legacy behavior for defensive inputs.
    const days = ymdDaysUntil(node.date, today) ?? Number.NaN
    const state: ExamNodeState = days < 0 ? 'passed' : days === 0 ? 'today' : 'upcoming'
    const isNext = !nextAssigned && state !== 'passed'
    if (isNext) nextAssigned = true
    return { ...node, state, isNext, daysUntil: days }
  })
}

/**
 * Countdown text for a node: legacy wording for today/tomorrow/future; passed
 * nodes (never "next" in legacy, which had no text for them) read 'N days ago'.
 */
export function formatCountdown(daysUntil: number): string {
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil > 1) return `in ${daysUntil} days`
  return `${Math.abs(daysUntil)} days ago`
}

/**
 * Absolute calendar-day gap between two exams (study-gap connector labels).
 * Returns 0 when a date is unparseable (collectExams never emits such nodes).
 */
export function gapDays(a: ExamNode, b: ExamNode): number {
  const da = parseYmd(a.date)
  const db = parseYmd(b.date)
  if (!da || !db) return 0
  return Math.abs(daysBetween(da, db))
}

/** Roadmap progress: passed count out of total, with a rounded percentage. */
export function examProgress(nodes: readonly AnnotatedExamNode[]): {
  done: number
  total: number
  pct: number
} {
  const total = nodes.length
  const done = nodes.filter((node) => node.state === 'passed').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

// ---------------------------------------------------------------------------
// Serpentine layout
// ---------------------------------------------------------------------------

/**
 * Computes the responsive column count from the available width, targeting
 * ~EXAM_NODE_TARGET_WIDTH px per node, clamped to 1..min(EXAM_MAX_COLUMNS,
 * count). Unknown widths (<= 0) fall back to the count-based maximum.
 */
export function computeExamColumns(containerWidth: number, count: number): number {
  const maxByCount = Math.max(1, Math.min(EXAM_MAX_COLUMNS, count || 1))
  if (!containerWidth || containerWidth <= 0) return maxByCount
  const byWidth = Math.floor(containerWidth / EXAM_NODE_TARGET_WIDTH)
  return Math.max(1, Math.min(maxByCount, byWidth))
}

/**
 * One cell of the roadmap matrix. The React renderer maps each cell onto one
 * CSS-grid cell (grid-template-columns: repeat(cols, ...)):
 *
 * - 'node': a roadmap exam. `connectLeft`/`connectRight` say whether a
 *   horizontal connector should be drawn towards the display-adjacent cell
 *   (true only when that neighbor is also a node — the legacy "blank
 *   connector" next to spacers is simply connect=false). `gapAfter` carries
 *   the day gap shown on the right-hand connector chip and is non-null
 *   exactly when `connectRight` is true.
 * - 'spacer': an empty cell that keeps partial rows aligned to the grid.
 * - 'turn': the row-drop connector between two node rows, positioned on the
 *   side where the flow turns; `gapAfter` is the day gap between the
 *   chronologically-last exam of the row above and the first of the row below.
 */
export type RoadmapCell =
  | {
      kind: 'node'
      node: AnnotatedExamNode
      connectRight: boolean
      connectLeft: boolean
      gapAfter: number | null
    }
  | { kind: 'spacer' }
  | { kind: 'turn'; gapAfter: number | null; side: 'left' | 'right' }

/** Splits nodes into flow-order rows of at most `size` (legacy chunkExams). */
function chunkExams(nodes: readonly AnnotatedExamNode[], size: number): AnnotatedExamNode[][] {
  const out: AnnotatedExamNode[][] = []
  const step = Math.max(1, size)
  for (let i = 0; i < nodes.length; i += step) out.push(nodes.slice(i, i + step))
  return out
}

/**
 * Lays out sorted nodes as a serpentine (boustrophedon) cell matrix:
 *
 * - Every row has exactly `cols` cells.
 * - Node rows sit at even matrix indices: flow row 0 reads left-to-right,
 *   flow row 1 right-to-left, and so on. Partial rows are padded with
 *   spacers on the flow's trailing side (right for left-to-right rows, left
 *   for reversed rows) so nodes stay aligned with the column grid above —
 *   mirroring the legacy buildRowCells.
 * - Between two node rows sits a turn row (odd matrix indices): all spacers
 *   except a single 'turn' cell in the column where the flow drops — the
 *   rightmost column after a left-to-right row (side 'right'), the leftmost
 *   after a reversed row (side 'left') — mirroring the legacy
 *   buildTurnConnector placement.
 */
export function layoutSerpentine(
  nodes: readonly AnnotatedExamNode[],
  cols: number,
): RoadmapCell[][] {
  if (nodes.length === 0) return []
  const columnCount = Math.max(1, Math.floor(cols))
  const rows = chunkExams(nodes, columnCount)
  const grid: RoadmapCell[][] = []

  rows.forEach((row, rowIndex) => {
    const reverse = rowIndex % 2 === 1
    const ordered = reverse ? [...row].reverse() : row

    // Nodes within a row are display-contiguous, so display-adjacency in
    // `ordered` is exactly where the legacy version drew connectors.
    const nodeCells: RoadmapCell[] = ordered.map((node, i) => {
      const left = ordered[i - 1]
      const right = ordered[i + 1]
      return {
        kind: 'node',
        node,
        connectLeft: left !== undefined,
        connectRight: right !== undefined,
        gapAfter: right !== undefined ? gapDays(node, right) : null,
      }
    })

    const pad: RoadmapCell[] = Array.from({ length: columnCount - ordered.length }, () => ({
      kind: 'spacer' as const,
    }))
    grid.push(reverse ? [...pad, ...nodeCells] : [...nodeCells, ...pad])

    const nextRow = rows[rowIndex + 1]
    if (nextRow) {
      // The flow crosses from the last node of this row to the first node of
      // the next row in sorted (date) order, not display order, so the
      // day-gap label stays correct even when a row is reversed.
      const side: 'left' | 'right' = reverse ? 'left' : 'right'
      const lastOfRow = row[row.length - 1]
      const firstOfNext = nextRow[0]
      const gap =
        lastOfRow !== undefined && firstOfNext !== undefined
          ? gapDays(lastOfRow, firstOfNext)
          : null
      const turnRow: RoadmapCell[] = Array.from({ length: columnCount }, () => ({
        kind: 'spacer' as const,
      }))
      turnRow[side === 'right' ? columnCount - 1 : 0] = { kind: 'turn', gapAfter: gap, side }
      grid.push(turnRow)
    }
  })

  return grid
}

// ---------------------------------------------------------------------------
// Custom exam validation
// ---------------------------------------------------------------------------

export interface CustomExamInput {
  name: string
  label: string
  date: string
}

export interface CustomExamErrors {
  name?: string
  label?: string
  date?: string
}

/**
 * Validates custom-exam form input: name required (<= 100 chars after trim),
 * label optional (<= 30 chars), date required and a real calendar day.
 */
export function validateCustomExam(input: CustomExamInput): {
  valid: boolean
  errors: CustomExamErrors
} {
  const errors: CustomExamErrors = {}
  const name = input.name.trim()
  if (!name) {
    errors.name = 'Exam name is required'
  } else if (name.length > VALIDATION_LIMITS.COURSE_NAME_MAX) {
    errors.name = `Exam name is too long (max ${VALIDATION_LIMITS.COURSE_NAME_MAX} characters)`
  }
  if (input.label.trim().length > VALIDATION_LIMITS.CUSTOM_EXAM_LABEL_MAX) {
    errors.label = `Label is too long (max ${VALIDATION_LIMITS.CUSTOM_EXAM_LABEL_MAX} characters)`
  }
  if (!parseYmd(input.date.trim())) {
    errors.date = 'A valid date (YYYY-MM-DD) is required'
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

// ---------------------------------------------------------------------------
// Color sanitizer (legacy XSS guard)
// ---------------------------------------------------------------------------

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/
const HSL_COLOR = /^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/
const RGB_COLOR = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/
const NAMED_COLOR = /^[a-zA-Z]+$/

/**
 * Sanitizes a user-controlled color for inline styles. Only hex, hsl(a),
 * rgb(a) and bare named colors pass; anything else (including empty strings
 * and injection attempts) falls back to 'var(--accent)'.
 */
export function cssColor(color: string): string {
  const c = color.trim()
  if (HEX_COLOR.test(c)) return c
  if (HSL_COLOR.test(c)) return c
  if (RGB_COLOR.test(c)) return c
  if (NAMED_COLOR.test(c)) return c
  return 'var(--accent)'
}

// ---------------------------------------------------------------------------
// Hide / restore (pure; store integration happens elsewhere)
// ---------------------------------------------------------------------------

/**
 * Hides a node from the roadmap (non-destructive: never touches exam data).
 * Returns a new array; unchanged content when the id is empty or already hidden.
 */
export function hideExam(hiddenIds: readonly string[], nodeId: string): string[] {
  if (!nodeId || hiddenIds.includes(nodeId)) return [...hiddenIds]
  return [...hiddenIds, nodeId]
}

/** Restores a previously hidden node. Returns a new array without the id. */
export function restoreExam(hiddenIds: readonly string[], nodeId: string): string[] {
  return hiddenIds.filter((id) => id !== nodeId)
}
