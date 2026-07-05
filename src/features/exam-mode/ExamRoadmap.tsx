import { useRef, useState } from 'react'
import type { Course, CustomExam, Semester } from '@/domain/model'
import {
  annotateExamStates,
  collectExams,
  computeExamColumns,
  examProgress,
  formatCountdown,
  layoutSerpentine,
  type MoedFilter,
} from '@/domain/examMode'
import { useAppState } from '@/hooks/session'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { CourseFormDialog } from '@/features/courses/CourseFormDialog'
import { ExamNode } from './ExamNode'
import { GapChip, TurnConnector } from './Connector'
import { HiddenTray } from './HiddenTray'
import { CustomExamDialog } from './CustomExamDialog'
import { useExamActions } from './useExamActions'

const MOED_FILTERS: ReadonlyArray<{ value: MoedFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'A', label: 'Moed A' },
  { value: 'B', label: 'Moed B' },
]

export function ExamRoadmap({ now = new Date() }: { now?: Date }) {
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  ) as Semester | undefined
  const { hideExam, restoreExam, restoreAll } = useExamActions()
  const toast = useToast()

  const [moedFilter, setMoedFilter] = useState<MoedFilter>('all')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<CustomExam | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(boardRef)

  if (!semester) return null

  const nodes = annotateExamStates(collectExams(semester, { moedFilter }), now)
  const cols = computeExamColumns(width, nodes.length)
  const matrix = layoutSerpentine(nodes, cols)
  const progress = examProgress(nodes)
  const nextNode = nodes.find((node) => node.isNext) ?? null

  const allNodes = collectExams(semester, { includeHidden: true })
  const hiddenNodes = allNodes.filter((node) => semester.hiddenExamIds.includes(node.id))

  const openCustomExam = (exam?: CustomExam) => {
    setEditingExam(exam ?? null)
    setCustomDialogOpen(true)
  }

  const onOpenNode = (nodeId: string, kind: 'course' | 'custom', courseId: string | null) => {
    if (kind === 'custom') {
      const exam = semester.customExams.find((e) => e.id === nodeId)
      if (exam) openCustomExam(exam)
      return
    }
    const course = semester.courses.find((c) => c.id === courseId)
    if (course) setEditingCourse(course)
  }

  const onRemoveNode = (nodeId: string, name: string) => {
    hideExam(semester.id, nodeId)
    toast.info(`Hid ${name}`, {
      action: { label: 'Undo', onClick: () => restoreExam(semester.id, nodeId) },
    })
  }

  const isEmpty = nodes.length === 0 && hiddenNodes.length === 0

  return (
    <section aria-label="Exam roadmap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-light text-ink">Exams</h2>
          {nextNode ? (
            <p className="text-xs text-ink-muted">
              Next: {nextNode.name} · {formatCountdown(nextNode.daysUntil)}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="primary" onClick={() => openCustomExam()}>
          + Add
        </Button>
      </div>

      {nodes.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted" aria-label="Exam progress">
              {progress.done}/{progress.total} passed
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-progress-bg">
              <div
                className="h-full bg-progress-fill"
                style={{ width: `${progress.pct}%` }}
                data-testid="exam-progress-fill"
              />
            </div>
          </div>
          <div
            className="inline-flex rounded-xs border border-line bg-inset p-0.5"
            role="group"
            aria-label="Moed filter"
          >
            {MOED_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={moedFilter === option.value}
                onClick={() => setMoedFilter(option.value)}
                className={cn(
                  'rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
                  moedFilter === option.value
                    ? 'bg-panel text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="mt-6 rounded-xs border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="text-sm text-ink-muted">No exams yet.</p>
          <Button className="mt-3" variant="primary" onClick={() => openCustomExam()}>
            + Add custom exam
          </Button>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="mt-4 grid gap-x-1 gap-y-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {matrix.flat().map((cell, index) => {
            if (cell.kind === 'spacer') return <div key={index} />
            if (cell.kind === 'turn') {
              return <TurnConnector key={index} gapDays={cell.gapAfter} side={cell.side} />
            }
            return (
              <div key={cell.node.id} className="flex flex-col">
                <ExamNode
                  node={cell.node}
                  onOpen={() => onOpenNode(cell.node.id, cell.node.kind, cell.node.courseId)}
                  onRemove={() => onRemoveNode(cell.node.id, cell.node.name)}
                  onEdit={
                    cell.node.kind === 'custom'
                      ? () => onOpenNode(cell.node.id, 'custom', null)
                      : undefined
                  }
                />
                {cell.connectRight ? (
                  <div className="mt-1 flex justify-end">
                    <GapChip days={cell.gapAfter} />
                  </div>
                ) : null}
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

      <CourseFormDialog
        open={editingCourse !== null}
        course={editingCourse}
        onOpenChange={(open) => {
          if (!open) setEditingCourse(null)
        }}
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
