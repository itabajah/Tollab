import { useMemo } from 'react'
import { courseColorFromHue } from '@/domain/colors'
import { newId } from '@/domain/ids'
import type { AppData, CustomExam, ExamViewMode, Semester } from '@/domain/model'
import { useSession } from '@/hooks/session'
import {
  addCustomExam as addCustomExamToSemester,
  hideExamNode as hideExamNodeOnSemester,
  removeCustomExam as removeCustomExamFromSemester,
  restoreAllExams as restoreAllExamsOnSemester,
  restoreExamNode as restoreExamNodeOnSemester,
  setExamViewMode as setExamViewModeOnSemester,
  updateCustomExam as updateCustomExamOnSemester,
} from '@/store/examActions'

/** Editable custom-exam fields collected by CustomExamDialog (hue -> hsl color). */
export interface CustomExamFormInput {
  name: string
  label: string
  date: string
  hue: number
}

function toCustomExamFields(input: CustomExamFormInput): Omit<CustomExam, 'id'> {
  return {
    name: input.name.trim(),
    label: input.label.trim(),
    date: input.date.trim(),
    color: courseColorFromHue(input.hue),
  }
}

/**
 * Exam-mode store actions. The app store exposes no setSemester, so each action
 * rebuilds the target semester through the pure examActions helpers, then commits
 * with setData (authoritative replace) followed by touch (stamp lastModified so
 * the change persists and wins cloud merges).
 */
export function useExamActions() {
  const store = useSession().appStore

  return useMemo(() => {
    const apply = (semesterId: string, recipe: (semester: Semester) => Semester) => {
      const state = store.getState()
      let changed = false
      const semesters = state.data.semesters.map((semester) => {
        if (semester.id !== semesterId) return semester
        changed = true
        return recipe(semester)
      })
      if (!changed) return
      const nextData: AppData = { ...state.data, semesters }
      state.setData(nextData)
      state.touch()
    }

    return {
      setViewMode: (semesterId: string, mode: ExamViewMode) =>
        apply(semesterId, (semester) => setExamViewModeOnSemester(semester, mode)),

      addCustomExam: (semesterId: string, input: CustomExamFormInput) => {
        const exam: CustomExam = { id: newId(), ...toCustomExamFields(input) }
        apply(semesterId, (semester) => addCustomExamToSemester(semester, exam))
      },

      updateCustomExam: (semesterId: string, id: string, input: CustomExamFormInput) =>
        apply(semesterId, (semester) =>
          updateCustomExamOnSemester(semester, id, toCustomExamFields(input)),
        ),

      removeCustomExam: (semesterId: string, id: string) =>
        apply(semesterId, (semester) => removeCustomExamFromSemester(semester, id)),

      /** Re-adds a previously removed custom exam verbatim (undo). */
      restoreCustomExam: (semesterId: string, exam: CustomExam) =>
        apply(semesterId, (semester) => addCustomExamToSemester(semester, exam)),

      hideExam: (semesterId: string, nodeId: string) =>
        apply(semesterId, (semester) => hideExamNodeOnSemester(semester, nodeId)),

      restoreExam: (semesterId: string, nodeId: string) =>
        apply(semesterId, (semester) => restoreExamNodeOnSemester(semester, nodeId)),

      restoreAll: (semesterId: string) =>
        apply(semesterId, (semester) => restoreAllExamsOnSemester(semester)),
    }
  }, [store])
}
