import type { CustomExam, ExamViewMode, Semester } from '@/domain/model'
import { hideExam, restoreExam } from '@/domain/examMode'

/**
 * Pure exam-mode mutations on a Semester. Each returns a NEW Semester (never
 * mutates its input) so the store can swap it in via setData. The store has no
 * dedicated setSemester action, so the useExamActions hook composes these with
 * setData + touch instead (see useExamActions.ts).
 */

export function setExamViewMode(semester: Semester, mode: ExamViewMode): Semester {
  return { ...semester, examViewMode: mode }
}

export function addCustomExam(semester: Semester, exam: CustomExam): Semester {
  return { ...semester, customExams: [...semester.customExams, exam] }
}

export function updateCustomExam(
  semester: Semester,
  id: string,
  patch: Partial<Omit<CustomExam, 'id'>>,
): Semester {
  return {
    ...semester,
    customExams: semester.customExams.map((exam) =>
      exam.id === id ? { ...exam, ...patch } : exam,
    ),
  }
}

/** Removes a custom exam and restores any hidden-id that referenced it (legacy parity). */
export function removeCustomExam(semester: Semester, id: string): Semester {
  return {
    ...semester,
    customExams: semester.customExams.filter((exam) => exam.id !== id),
    hiddenExamIds: restoreExam(semester.hiddenExamIds, id),
  }
}

export function hideExamNode(semester: Semester, nodeId: string): Semester {
  return { ...semester, hiddenExamIds: hideExam(semester.hiddenExamIds, nodeId) }
}

export function restoreExamNode(semester: Semester, nodeId: string): Semester {
  return { ...semester, hiddenExamIds: restoreExam(semester.hiddenExamIds, nodeId) }
}

export function restoreAllExams(semester: Semester): Semester {
  return { ...semester, hiddenExamIds: [] }
}
