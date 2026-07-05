import { z } from 'zod'
import { parseYmd } from '@/lib/dates'

/**
 * Single source of truth for the Tollab domain model.
 * All persistence (localStorage v3, cloud payloads, export files) and all UI
 * state flow through these schemas; parsing fills defaults and validates.
 */

export const VALIDATION_LIMITS = {
  COURSE_NAME_MAX: 100,
  HOMEWORK_TITLE_MAX: 200,
  NOTES_MAX: 5000,
  URL_MAX: 2048,
  PROFILE_NAME_MAX: 50,
  SEMESTER_NAME_MAX: 50,
  CUSTOM_EXAM_LABEL_MAX: 30,
} as const

export const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM (00:00-23:59)')

export const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .refine((s) => parseYmd(s) !== null, 'expected a real calendar date')

/**
 * A date field that may be unset ('') or a valid YYYY-MM-DD calendar date. Any
 * invalid value — malformed OR shape-valid-but-impossible like 2026-02-31 (which
 * a bad importer can produce) — coerces to '' rather than failing, so sort and
 * urgency agree on it and one bad date can't sink the whole profile on read.
 */
export const optionalYmdSchema = z
  .string()
  .transform((s) => (parseYmd(s) !== null ? s : ''))
  .default('')

export const scheduleSlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  start: hhmmSchema,
  end: hhmmSchema,
})
export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>

export const homeworkLinkSchema = z.object({
  label: z.string().default(''),
  url: z.string().max(VALIDATION_LIMITS.URL_MAX),
})
export type HomeworkLink = z.infer<typeof homeworkLinkSchema>

export const homeworkSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(VALIDATION_LIMITS.HOMEWORK_TITLE_MAX),
  dueDate: optionalYmdSchema,
  completed: z.boolean().default(false),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).default(''),
  links: z.array(homeworkLinkSchema).default([]),
})
export type Homework = z.infer<typeof homeworkSchema>

export const recordingItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  videoLink: z.string().max(VALIDATION_LIMITS.URL_MAX).default(''),
  slideLink: z.string().max(VALIDATION_LIMITS.URL_MAX).default(''),
  watched: z.boolean().default(false),
})
export type RecordingItem = z.infer<typeof recordingItemSchema>

export const recordingTabSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  items: z.array(recordingItemSchema).default([]),
})
export type RecordingTab = z.infer<typeof recordingTabSchema>

/** The two built-in recording tabs that cannot be renamed or deleted. */
export const PROTECTED_TAB_IDS = ['lectures', 'tutorials'] as const

export function createDefaultRecordingTabs(): RecordingTab[] {
  return [
    { id: 'lectures', name: 'Lectures', items: [] },
    { id: 'tutorials', name: 'Tutorials', items: [] },
  ]
}

// Enum view-preferences use `.catch` so a value written by a newer build (or a
// corrupted one) degrades to the default on read instead of failing the whole
// profile parse — offline-first data must survive schema drift, never vanish.
export const homeworkSortSchema = z
  .enum(['manual', 'date_asc', 'date_desc', 'completed_first', 'incomplete_first', 'name_asc'])
  .default('date_asc')
  .catch('date_asc')
export type HomeworkSort = z.infer<typeof homeworkSortSchema>

export const recordingSortSchema = z
  .enum(['default', 'manual', 'name_asc', 'name_desc', 'watched_first', 'unwatched_first'])
  .default('default')
  .catch('default')
export type RecordingSort = z.infer<typeof recordingSortSchema>

export const examDatesSchema = z.object({
  moedA: optionalYmdSchema,
  moedB: optionalYmdSchema,
})
export type ExamDates = z.infer<typeof examDatesSchema>

export const courseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(VALIDATION_LIMITS.COURSE_NAME_MAX),
  color: z.string(),
  number: z.string().max(20).default(''),
  points: z.string().max(10).default(''),
  lecturer: z.string().max(200).default(''),
  faculty: z.string().max(200).default(''),
  location: z.string().max(200).default(''),
  grade: z.string().max(10).default(''),
  syllabus: z.string().max(VALIDATION_LIMITS.URL_MAX).default(''),
  notes: z.string().max(VALIDATION_LIMITS.NOTES_MAX).default(''),
  exams: examDatesSchema.prefault({}),
  schedule: z.array(scheduleSlotSchema).default([]),
  homework: z.array(homeworkSchema).default([]),
  recordings: z
    .object({ tabs: z.array(recordingTabSchema) })
    .default(() => ({ tabs: createDefaultRecordingTabs() })),
  // Persisted view preferences (the legacy app lost these on reload).
  homeworkSort: homeworkSortSchema,
  recordingsSort: z.record(z.string(), recordingSortSchema).default({}),
  showCompletedHomework: z.boolean().default(true),
})
export type Course = z.infer<typeof courseSchema>

export const customExamSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(VALIDATION_LIMITS.COURSE_NAME_MAX),
  label: z.string().max(VALIDATION_LIMITS.CUSTOM_EXAM_LABEL_MAX).default(''),
  date: ymdSchema,
  color: z.string().default(''),
})
export type CustomExam = z.infer<typeof customExamSchema>

export const calendarSettingsSchema = z.object({
  startHour: z.number().int().min(0).max(23).default(8),
  endHour: z.number().int().min(1).max(24).default(20),
  visibleDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5]),
})
export type CalendarSettings = z.infer<typeof calendarSettingsSchema>

export const examViewModeSchema = z.enum(['auto', 'semester', 'exam']).default('auto').catch('auto')
export type ExamViewMode = z.infer<typeof examViewModeSchema>

export const semesterSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(VALIDATION_LIMITS.SEMESTER_NAME_MAX),
  courses: z.array(courseSchema).default([]),
  calendarSettings: calendarSettingsSchema.prefault({}),
  examViewMode: examViewModeSchema,
  hiddenExamIds: z.array(z.string()).default([]),
  customExams: z.array(customExamSchema).default([]),
})
export type Semester = z.infer<typeof semesterSchema>

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light').catch('light'),
  colorTheme: z.enum(['colorful', 'single', 'mono']).default('colorful').catch('colorful'),
  baseColorHue: z.number().min(0).max(360).default(200),
  // Global display filters (homework sidebar / recordings): both hide the
  // "done" items by default, matching a to-do list's natural resting state.
  showCompleted: z.boolean().default(false),
  showWatchedRecordings: z.boolean().default(false),
})
export type Settings = z.infer<typeof settingsSchema>

export const appDataSchema = z.object({
  semesters: z.array(semesterSchema).default([]),
  settings: settingsSchema.prefault({}),
  lastModified: z.string(),
})
export type AppData = z.infer<typeof appDataSchema>

export const profileMetaSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(VALIDATION_LIMITS.PROFILE_NAME_MAX),
})
export type ProfileMeta = z.infer<typeof profileMetaSchema>

export function createEmptyAppData(lastModified: string): AppData {
  return appDataSchema.parse({ semesters: [], settings: {}, lastModified })
}
