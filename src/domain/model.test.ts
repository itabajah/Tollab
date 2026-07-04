import {
  appDataSchema,
  calendarSettingsSchema,
  courseSchema,
  customExamSchema,
  homeworkSchema,
  profileMetaSchema,
  recordingTabSchema,
  scheduleSlotSchema,
  semesterSchema,
  settingsSchema,
  createDefaultRecordingTabs,
  createEmptyAppData,
  PROTECTED_TAB_IDS,
} from './model'

describe('scheduleSlotSchema', () => {
  it('accepts a valid slot', () => {
    const slot = scheduleSlotSchema.parse({ day: 0, start: '08:30', end: '10:30' })
    expect(slot).toEqual({ day: 0, start: '08:30', end: '10:30' })
  })

  it.each([
    [{ day: 7, start: '08:00', end: '09:00' }],
    [{ day: -1, start: '08:00', end: '09:00' }],
    [{ day: 1.5, start: '08:00', end: '09:00' }],
    [{ day: 0, start: '8:00', end: '09:00' }],
    [{ day: 0, start: '08:00', end: '9pm' }],
  ])('rejects invalid slot %j', (bad) => {
    expect(scheduleSlotSchema.safeParse(bad).success).toBe(false)
  })
})

describe('homeworkSchema', () => {
  it('fills defaults for optional fields', () => {
    const hw = homeworkSchema.parse({ id: 'h1', title: 'Ex 1' })
    expect(hw).toEqual({
      id: 'h1',
      title: 'Ex 1',
      dueDate: '',
      completed: false,
      notes: '',
      links: [],
    })
  })

  it('accepts an empty dueDate but rejects a malformed one', () => {
    expect(homeworkSchema.safeParse({ id: 'h', title: 't', dueDate: '' }).success).toBe(true)
    expect(homeworkSchema.safeParse({ id: 'h', title: 't', dueDate: '2025-06-30' }).success).toBe(
      true,
    )
    expect(homeworkSchema.safeParse({ id: 'h', title: 't', dueDate: '30-06-2025' }).success).toBe(
      false,
    )
  })
})

describe('courseSchema', () => {
  it('fills all optional fields and default recording tabs', () => {
    const course = courseSchema.parse({ id: 'c1', name: 'Calculus 1', color: 'hsl(0, 45%, 50%)' })
    expect(course.number).toBe('')
    expect(course.exams).toEqual({ moedA: '', moedB: '' })
    expect(course.schedule).toEqual([])
    expect(course.homework).toEqual([])
    expect(course.recordings.tabs.map((t) => t.id)).toEqual(['lectures', 'tutorials'])
    expect(course.homeworkSort).toBe('date_asc')
    expect(course.recordingsSort).toEqual({})
    expect(course.showCompletedHomework).toBe(true)
  })

  it('requires a non-empty name', () => {
    expect(courseSchema.safeParse({ id: 'c', name: '', color: 'x' }).success).toBe(false)
  })

  it('caps name length at 100', () => {
    expect(courseSchema.safeParse({ id: 'c', name: 'x'.repeat(101), color: 'x' }).success).toBe(
      false,
    )
  })

  it('keeps per-tab recording sort orders', () => {
    const course = courseSchema.parse({
      id: 'c1',
      name: 'Algo',
      color: 'hsl(137, 45%, 50%)',
      recordingsSort: { lectures: 'name_asc' },
    })
    expect(course.recordingsSort.lectures).toBe('name_asc')
  })
})

describe('recordingTabSchema', () => {
  it('defaults items to empty', () => {
    expect(recordingTabSchema.parse({ id: 'lectures', name: 'Lectures' }).items).toEqual([])
  })
})

describe('customExamSchema', () => {
  it('requires name and valid date', () => {
    expect(customExamSchema.safeParse({ id: 'x', name: '', date: '2025-01-01' }).success).toBe(
      false,
    )
    expect(customExamSchema.safeParse({ id: 'x', name: 'Quiz', date: 'nope' }).success).toBe(false)
    const exam = customExamSchema.parse({ id: 'x', name: 'Quiz 1', date: '2025-01-20' })
    expect(exam.label).toBe('')
  })

  it('caps label at 30 chars', () => {
    expect(
      customExamSchema.safeParse({ id: 'x', name: 'Q', date: '2025-01-01', label: 'x'.repeat(31) })
        .success,
    ).toBe(false)
  })
})

describe('calendarSettingsSchema', () => {
  it('defaults to 08:00-20:00, Sunday-Friday', () => {
    expect(calendarSettingsSchema.parse({})).toEqual({
      startHour: 8,
      endHour: 20,
      visibleDays: [0, 1, 2, 3, 4, 5],
    })
  })

  it('rejects out-of-range hours', () => {
    expect(calendarSettingsSchema.safeParse({ startHour: 24 }).success).toBe(false)
    expect(calendarSettingsSchema.safeParse({ endHour: 25 }).success).toBe(false)
  })
})

describe('semesterSchema', () => {
  it('fills exam-mode defaults', () => {
    const semester = semesterSchema.parse({ id: 's1', name: 'Winter 2025-2026' })
    expect(semester.examViewMode).toBe('auto')
    expect(semester.hiddenExamIds).toEqual([])
    expect(semester.customExams).toEqual([])
    expect(semester.courses).toEqual([])
  })
})

describe('settingsSchema', () => {
  it('matches legacy defaults', () => {
    expect(settingsSchema.parse({})).toEqual({
      theme: 'light',
      colorTheme: 'colorful',
      baseColorHue: 200,
      showCompleted: true,
      showWatchedRecordings: false,
    })
  })
})

describe('appDataSchema / factories', () => {
  it('parses a complete empty app data', () => {
    const data = createEmptyAppData('2026-07-04T00:00:00.000Z')
    const parsed = appDataSchema.parse(data)
    expect(parsed.semesters).toEqual([])
    expect(parsed.lastModified).toBe('2026-07-04T00:00:00.000Z')
  })

  it('rejects app data without lastModified', () => {
    expect(appDataSchema.safeParse({ semesters: [], settings: {} }).success).toBe(false)
  })
})

describe('createDefaultRecordingTabs', () => {
  it('creates protected lectures + tutorials tabs', () => {
    const tabs = createDefaultRecordingTabs()
    expect(tabs).toEqual([
      { id: 'lectures', name: 'Lectures', items: [] },
      { id: 'tutorials', name: 'Tutorials', items: [] },
    ])
    expect(PROTECTED_TAB_IDS).toEqual(['lectures', 'tutorials'])
  })
})

describe('profileMetaSchema', () => {
  it('caps profile name at 50 chars', () => {
    expect(profileMetaSchema.safeParse({ id: 'p', name: 'x'.repeat(51) }).success).toBe(false)
    expect(profileMetaSchema.safeParse({ id: 'p', name: 'Default' }).success).toBe(true)
  })
})
