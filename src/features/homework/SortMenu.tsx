import type { HomeworkSort } from '@/domain/model'
import { Select } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

/** Sort options for the homework list, mirroring the legacy sort dropdown order. */
const OPTIONS: ReadonlyArray<{ value: HomeworkSort; label: string }> = [
  { value: 'date_asc', label: 'Date (Earliest)' },
  { value: 'date_desc', label: 'Date (Latest)' },
  { value: 'incomplete_first', label: 'Incomplete First' },
  { value: 'completed_first', label: 'Completed First' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'manual', label: 'Manual' },
]

/** Reusable sort dropdown bound to a course's `homeworkSort`. */
export function SortMenu({
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Sort homework',
}: {
  value: HomeworkSort
  onChange: (sort: HomeworkSort) => void
  className?: string
  'aria-label'?: string
}) {
  return (
    <Select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as HomeworkSort)}
      className={cn('!w-auto', className)}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  )
}
