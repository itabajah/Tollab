import { createSemester } from '@/domain/semester'
import type { CustomExam, Semester } from '@/domain/model'
import {
  addCustomExam,
  hideExamNode,
  removeCustomExam,
  restoreAllExams,
  restoreExamNode,
  setExamViewMode,
  updateCustomExam,
} from './examActions'

function baseSemester(): Semester {
  return createSemester('Spring 2026', 'sem1')
}

const customExam: CustomExam = {
  id: 'cx1',
  name: 'Project Demo',
  label: 'Demo',
  date: '2026-07-15',
  color: 'hsl(200, 45%, 50%)',
}

describe('examActions (pure semester helpers)', () => {
  it('setExamViewMode returns a new semester with the mode set', () => {
    const semester = baseSemester()
    const next = setExamViewMode(semester, 'exam')
    expect(next.examViewMode).toBe('exam')
    expect(semester.examViewMode).toBe('auto') // original untouched
    expect(next).not.toBe(semester)
  })

  it('addCustomExam appends without mutating the original', () => {
    const semester = baseSemester()
    const next = addCustomExam(semester, customExam)
    expect(next.customExams).toHaveLength(1)
    expect(next.customExams[0]).toEqual(customExam)
    expect(semester.customExams).toHaveLength(0)
    expect(next.customExams).not.toBe(semester.customExams)
  })

  it('updateCustomExam merges a patch onto the matching exam only', () => {
    const semester = addCustomExam(baseSemester(), customExam)
    const next = updateCustomExam(semester, 'cx1', { name: 'Renamed', label: 'Quiz' })
    expect(next.customExams[0]).toMatchObject({
      id: 'cx1',
      name: 'Renamed',
      label: 'Quiz',
      date: '2026-07-15',
    })
  })

  it('updateCustomExam is a no-op when the id is unknown', () => {
    const semester = addCustomExam(baseSemester(), customExam)
    const next = updateCustomExam(semester, 'nope', { name: 'X' })
    expect(next.customExams[0]?.name).toBe('Project Demo')
  })

  it('removeCustomExam deletes the exam and restores any hidden reference to it', () => {
    let semester = addCustomExam(baseSemester(), customExam)
    semester = hideExamNode(semester, 'cx1')
    expect(semester.hiddenExamIds).toContain('cx1')

    const next = removeCustomExam(semester, 'cx1')
    expect(next.customExams).toHaveLength(0)
    expect(next.hiddenExamIds).not.toContain('cx1')
  })

  it('hideExamNode adds an id once (idempotent) and does not mutate the input', () => {
    const semester = baseSemester()
    const hidden = hideExamNode(semester, 'course1:A')
    expect(hidden.hiddenExamIds).toEqual(['course1:A'])
    expect(semester.hiddenExamIds).toEqual([])

    const again = hideExamNode(hidden, 'course1:A')
    expect(again.hiddenExamIds).toEqual(['course1:A'])
  })

  it('restoreExamNode removes a single hidden id', () => {
    let semester = hideExamNode(baseSemester(), 'course1:A')
    semester = hideExamNode(semester, 'course2:B')
    const next = restoreExamNode(semester, 'course1:A')
    expect(next.hiddenExamIds).toEqual(['course2:B'])
  })

  it('restoreAllExams clears the hidden set', () => {
    let semester = hideExamNode(baseSemester(), 'course1:A')
    semester = hideExamNode(semester, 'course2:B')
    const next = restoreAllExams(semester)
    expect(next.hiddenExamIds).toEqual([])
  })
})
