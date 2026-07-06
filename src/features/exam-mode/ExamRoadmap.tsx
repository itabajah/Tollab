import { useRef, useState } from 'react'
import type { CustomExam } from '@/domain/model'
import {
  annotateExamStates,
  collectExams,
  computeExamColumns,
  examProgress,
  formatCountdown,
  layoutSerpentine,
  type AnnotatedExamNode,
  type MoedFilter,
} from '@/domain/examMode'
import { useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { cn } from '@/lib/cn'
import { ExamNode } from './ExamNode'
import { SharedExamDay } from './SharedExamDay'
import { HorizontalConnector, TurnConnector, TurnStem } from './Connector'
import { HiddenTray } from './HiddenTray'
import { CustomExamDialog } from './CustomExamDialog'
import { useExamActions } from './useExamActions'

const MOED_FILTERS: ReadonlyArray<{ value: MoedFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'A', label: 'Moed A' },
  { value: 'B', label: 'Moed B' },
]

export function ExamRoadmap({ now: nowProp }: { now?: Date }) {
  const now = useNow(nowProp)
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  )
  const { hideExam, restoreExam, restoreAll } = useExamActions()
  const { openCourse } = useCourseDialog()
  const toast = useToast()

  const [moedFilter, setMoedFilter] = useState<MoedFilter>('all')
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<CustomExam | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(boardRef)

  if (!semester) return null

  const nodes = annotateExamStates(collectExams(semester, { moedFilter }), now)
  // Same-day exams share one roadmap box (grouped here at render level, so the
  // domain layout + its tests stay unchanged). Nodes are date-sorted, so exams
  // on the same day are already adjacent; each group's first node represents it
  // in the serpentine layout (a real node carrying the group's date, so the gap
  // math between boxes is correct and never a spurious 0-day step).
  const groups: AnnotatedExamNode[][] = []
  for (const node of nodes) {
    const last = groups[groups.length - 1]
    if (last && last[0]!.date === node.date) last.push(node)
    else groups.push([node])
  }
  const representatives = groups.map((g) => g[0]!)
  const groupByRepId = new Map(representatives.map((rep, i) => [rep.id, groups[i]!]))
  // Cap displayed columns so the snake stays legible and every (now longer)
  // connector has room; the width-based count still narrows on small panes.
  const cols = Math.min(computeExamColumns(width, representatives.length), 3)
  const matrix = layoutSerpentine(representatives, cols)
  const flat = matrix.flat()
  const progress = examProgress(nodes)
  const nextNode = nodes.find((node) => node.isNext) ?? null

  // Hidden nodes matching the ACTIVE filter (so the tray + empty states are
  // filter-aware), plus a global check so we can tell "no exams at all" apart
  // from "none match this filter" and never render a blank board.
  const hiddenNodes = collectExams(semester, { moedFilter, includeHidden: true }).filter((node) =>
    semester.hiddenExamIds.includes(node.id),
  )
  const hasAnyExam = collectExams(semester, { includeHidden: true }).length > 0
  const filteredEmpty = hasAnyExam && nodes.length === 0

  const openCustomExam = (exam?: CustomExam) => {
    setEditingExam(exam ?? null)
    setCustomDialogOpen(true)
  }

  const onOpenNode = (
    nodeId: string,
    kind: 'course' | 'custom',
    courseId: string | null,
    moed: 'A' | 'B' | null,
  ) => {
    if (kind === 'custom') {
      const exam = semester.customExams.find((e) => e.id === nodeId)
      if (exam) openCustomExam(exam)
      return
    }
    if (!courseId) return
    // Open the course on Details and highlight the exam field this node maps to.
    openCourse({
      courseId,
      tab: 'details',
      ...(moed ? { highlight: { kind: 'exam' as const, moed } } : {}),
    })
  }

  const onRemoveNode = (nodeId: string, name: string) => {
    hideExam(semester.id, nodeId)
    toast.info(`Hid ${name}`, {
      action: { label: 'Undo', onClick: () => restoreExam(semester.id, nodeId) },
    })
  }

  const isEmpty = !hasAnyExam

  return (
    <section aria-label="Exam roadmap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-ink">Exams</h2>
          {nextNode ? (
            <p className="text-sm text-ink-muted">
              Next:{' '}
              <span className="font-medium text-ink">
                {nextNode.name} · {formatCountdown(nextNode.daysUntil)}
              </span>
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="primary" onClick={() => openCustomExam()}>
          + Add
        </Button>
      </div>

      {hasAnyExam ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {nodes.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted" aria-label="Exam progress">
                {progress.done}/{progress.total} passed
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-progress-bg">
                <div
                  className="h-full rounded-full bg-progress-fill transition-[width] duration-500 ease-out"
                  style={{ width: `${progress.pct}%` }}
                  data-testid="exam-progress-fill"
                />
              </div>
            </div>
          ) : (
            <span />
          )}
          <SegmentedControl
            aria-label="Moed filter"
            options={MOED_FILTERS}
            value={moedFilter}
            onChange={setMoedFilter}
          />
        </div>
      ) : null}

      {isEmpty ? (
        <div className="mt-6 rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No exams yet.</p>
          <Button className="mt-3" variant="primary" onClick={() => openCustomExam()}>
            + Add custom exam
          </Button>
        </div>
      ) : filteredEmpty ? (
        <div className="mt-6 rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">
            {moedFilter === 'all'
              ? 'All exams are hidden — restore one below.'
              : hiddenNodes.length > 0
                ? `All ${moedFilter === 'A' ? 'Moed A' : 'Moed B'} exams are hidden — restore below.`
                : `No ${moedFilter === 'A' ? 'Moed A' : 'Moed B'} exams in this semester.`}
          </p>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="mt-4 grid items-start gap-x-24 gap-y-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {flat.map((cell, index) => {
            if (cell.kind === 'spacer') return <div key={`spacer-${index}`} />
            // The turn cell drops the snake to the next row; its fixed height is
            // the gap between rows. The flow-last node above grows a stem down
            // into it (below) so the drop stays attached even in a tall row.
            if (cell.kind === 'turn')
              return <TurnConnector key={`turn-${index}`} gapDays={cell.gapAfter} />

            // Reversed rows (the snake's right-to-left legs) flow leftward, so
            // their arrowheads point left. Derived from the matrix row index —
            // node rows are even; every 2nd node row is reversed.
            const reverse = Math.floor(index / cols) % 4 === 2
            const group = groupByRepId.get(cell.node.id)!
            // A turn cell directly below (same column, next row) means this node
            // is the row's flow-last: its cell stretches and grows a stem down to
            // meet the drop connector, so the two stay joined in a tall row.
            const below = flat[index + cols]
            const turnBelow = below && below.kind === 'turn' ? below : null
            return (
              <div
                key={cell.node.id}
                className={cn('relative flex flex-col', turnBelow && 'self-stretch')}
              >
                {group.length === 1 ? (
                  <ExamNode
                    node={cell.node}
                    onOpen={() =>
                      onOpenNode(cell.node.id, cell.node.kind, cell.node.courseId, cell.node.moed)
                    }
                    onRemove={() => onRemoveNode(cell.node.id, cell.node.name)}
                    onEdit={
                      cell.node.kind === 'custom'
                        ? () => onOpenNode(cell.node.id, 'custom', null, null)
                        : undefined
                    }
                  />
                ) : (
                  <SharedExamDay
                    group={group}
                    onOpen={(n) => onOpenNode(n.id, n.kind, n.courseId, n.moed)}
                    onRemove={(n) => onRemoveNode(n.id, n.name)}
                    onEdit={(n) => onOpenNode(n.id, 'custom', null, null)}
                  />
                )}
                {cell.connectRight ? (
                  <HorizontalConnector days={cell.gapAfter} dir={reverse ? 'left' : 'right'} />
                ) : null}
                {turnBelow ? <TurnStem /> : null}
              </div>
            )
          })}
        </div>
      )}

      <HiddenTray
        hidden={hiddenNodes}
        onRestore={(nodeId) => restoreExam(semester.id, nodeId)}
        onRestoreAll={() => restoreAll(semester.id)}
      />

      <CustomExamDialog
        open={customDialogOpen}
        semesterId={semester.id}
        exam={editingExam}
        onOpenChange={(open) => {
          setCustomDialogOpen(open)
          if (!open) setEditingExam(null)
        }}
      />
    </section>
  )
}
