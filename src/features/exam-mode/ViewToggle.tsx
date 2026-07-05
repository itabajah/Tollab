import { resolveExamViewMode } from '@/domain/examMode'
import { useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useExamActions } from './useExamActions'

const VIEW_OPTIONS = [
  { value: 'semester', label: 'Schedule' },
  { value: 'exam', label: 'Exams' },
] as const

/**
 * The persistent right-pane view switch: a Schedule | Exams segmented control,
 * plus an "Auto" reset chip that appears only when the user has pinned a mode.
 * The active pill reflects the *resolved* view (auto decides by exam dates).
 */
export function ViewToggle({ now: nowProp }: { now?: Date }) {
  const now = useNow(nowProp)
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  )
  const { setViewMode } = useExamActions()

  if (!semester) return null

  const resolved = resolveExamViewMode(semester, now)
  const overridden = semester.examViewMode !== 'auto'

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        aria-label="Right panel view"
        options={VIEW_OPTIONS}
        value={resolved}
        onChange={(v) => setViewMode(semester.id, v)}
      />
      {overridden ? (
        <button
          type="button"
          onClick={() => setViewMode(semester.id, 'auto')}
          className="rounded-control border border-line-strong px-2.5 py-1 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          title="Reset to automatic (decide by exam dates)"
        >
          Auto
        </button>
      ) : null}
    </div>
  )
}
