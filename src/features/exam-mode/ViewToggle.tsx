import type { Semester } from '@/domain/model'
import { resolveExamViewMode } from '@/domain/examMode'
import { useAppState } from '@/hooks/session'
import { cn } from '@/lib/cn'
import { useExamActions } from './useExamActions'

const pill = 'rounded-xs px-3.5 py-1.5 text-xs font-medium transition-colors'

/**
 * The persistent right-pane view switch: a Schedule | Exams segmented control,
 * plus an "Auto" reset chip that appears only when the user has pinned a mode.
 * The active pill reflects the *resolved* view (auto decides by exam dates).
 */
export function ViewToggle({ now }: { now: Date }) {
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  ) as Semester | undefined
  const { setViewMode } = useExamActions()

  if (!semester) return null

  const resolved = resolveExamViewMode(semester, now)
  const overridden = semester.examViewMode !== 'auto'

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Right panel view">
      <div className="inline-flex rounded-xs border border-line bg-inset p-0.5">
        <button
          type="button"
          aria-pressed={resolved === 'semester'}
          onClick={() => setViewMode(semester.id, 'semester')}
          className={cn(
            pill,
            resolved === 'semester'
              ? 'bg-panel text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          Schedule
        </button>
        <button
          type="button"
          aria-pressed={resolved === 'exam'}
          onClick={() => setViewMode(semester.id, 'exam')}
          className={cn(
            pill,
            resolved === 'exam' ? 'bg-panel text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          Exams
        </button>
      </div>
      {overridden ? (
        <button
          type="button"
          onClick={() => setViewMode(semester.id, 'auto')}
          className="rounded-xs border border-line-strong px-2.5 py-1 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink"
          title="Reset to automatic (decide by exam dates)"
        >
          Auto
        </button>
      ) : null}
    </div>
  )
}
