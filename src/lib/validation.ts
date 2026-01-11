import { z } from 'zod';

// ============================================
// Zod Schemas for Validation
// ============================================

// Common string schema with trim
const trimmedString = z.string().trim();

// Course number validation (Technion course code)
export const courseNumberSchema = z
  .string()
  .regex(/^\d{6}$/, 'מספר הקורס חייב להכיל 6 ספרות')
  .optional()
  .or(z.literal(''));

// Credit points validation
export const creditPointsSchema = z
  .string()
  .regex(/^[\d.]+$/, 'נקודות זכות חייבות להיות מספר')
  .optional()
  .or(z.literal(''));

// Grade validation
export const gradeSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: 'הציון חייב להיות בין 0 ל-100' }
  )
  .optional()
  .or(z.literal(''));

// Time format validation (HH:MM)
export const timeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'פורמט שעה לא תקין (HH:MM)');

// Date format validation (YYYY-MM-DD)
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'פורמט תאריך לא תקין (YYYY-MM-DD)')
  .optional()
  .or(z.literal(''));

// URL validation
export const urlSchema = z
  .string()
  .url('כתובת URL לא תקינה')
  .optional()
  .or(z.literal(''));

// YouTube URL validation
export const youtubeUrlSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true;
      return (
        val.includes('youtube.com') ||
        val.includes('youtu.be') ||
        val.includes('panopto')
      );
    },
    { message: 'כתובת וידאו לא תקינה' }
  )
  .optional()
  .or(z.literal(''));

// ============================================
// Entity Schemas
// ============================================

export const homeworkLinkSchema = z.object({
  label: trimmedString.min(1, 'שם הקישור נדרש'),
  url: z.string().url('כתובת URL לא תקינה'),
});

export const homeworkSchema = z.object({
  id: z.string().optional(),
  title: trimmedString.min(1, 'כותרת המטלה נדרשת'),
  dueDate: z.string().min(1, 'תאריך הגשה נדרש'),
  completed: z.boolean().default(false),
  notes: z.string().default(''),
  links: z.array(homeworkLinkSchema).default([]),
});

export const recordingSchema = z.object({
  id: z.string().optional(),
  name: trimmedString.min(1, 'שם ההקלטה נדרש'),
  videoLink: z.string().default(''),
  slideLink: z.string().default(''),
  watched: z.boolean().default(false),
});

export const scheduleItemSchema = z.object({
  id: z.string().optional(),
  day: z.number().min(0).max(6),
  start: timeSchema,
  end: timeSchema,
  type: z.enum(['lecture', 'tutorial', 'lab', 'other']).optional(),
  location: z.string().optional(),
});

export const courseSchema = z.object({
  id: z.string().optional(),
  name: trimmedString.min(1, 'שם הקורס נדרש'),
  color: z.string().default(''),
  number: courseNumberSchema,
  points: creditPointsSchema,
  lecturer: z.string().default(''),
  faculty: z.string().default(''),
  location: z.string().default(''),
  grade: gradeSchema,
  syllabus: z.string().default(''),
  notes: z.string().default(''),
  exams: z
    .object({
      moedA: dateSchema,
      moedB: dateSchema,
    })
    .default({ moedA: '', moedB: '' }),
  schedule: z.array(scheduleItemSchema).default([]),
  homework: z.array(homeworkSchema).default([]),
  recordings: z
    .object({
      tabs: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            items: z.array(recordingSchema),
          })
        )
        .default([]),
    })
    .default({ tabs: [] }),
});

export const semesterSchema = z.object({
  id: z.string().optional(),
  name: trimmedString.min(1, 'שם הסמסטר נדרש'),
  courses: z.array(courseSchema).default([]),
  calendarSettings: z
    .object({
      startHour: z.number().min(0).max(23).default(8),
      endHour: z.number().min(1).max(24).default(20),
      visibleDays: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5]),
    })
    .default({ startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] }),
});

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  showCompleted: z.boolean().default(true),
  showWatchedRecordings: z.boolean().default(true),
  colorTheme: z.enum(['colorful', 'single', 'mono']).default('colorful'),
  baseColorHue: z.number().min(0).max(360).default(220),
});

export const appDataSchema = z.object({
  semesters: z.array(semesterSchema).default([]),
  settings: settingsSchema.optional().default({
    theme: 'system',
    showCompleted: true,
    showWatchedRecordings: true,
    colorTheme: 'colorful',
    baseColorHue: 220,
  }),
  lastModified: z.string().default(() => new Date().toISOString()),
});

// ============================================
// Validation Helper Functions
// ============================================

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
};

export function validateCourse(data: unknown): ValidationResult<z.infer<typeof courseSchema>> {
  const result = courseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.issues) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

export function validateHomework(data: unknown): ValidationResult<z.infer<typeof homeworkSchema>> {
  const result = homeworkSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.issues) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

export function validateRecording(
  data: unknown
): ValidationResult<z.infer<typeof recordingSchema>> {
  const result = recordingSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.issues) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

export function validateAppData(data: unknown): ValidationResult<z.infer<typeof appDataSchema>> {
  const result = appDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.issues) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

// ============================================
// Form validation helpers
// ============================================

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} נדרש`;
  }
  return null;
}

export function validateTimeRange(start: string, end: string): string | null {
  if (!start || !end) return null;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    return 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
  }

  return null;
}

export function validateFutureDate(date: string): string | null {
  if (!date) return null;

  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate < today) {
    return 'התאריך כבר עבר';
  }

  return null;
}
