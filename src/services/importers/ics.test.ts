import icsFixture from './__fixtures__/cheesefork.ics?raw'
import { parseIcs, translateSemesterName, unfoldIcsLines, type ImportedCourse } from './ics'

const ics = (lines: string[]): string =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n')

const vevent = (...props: string[]): string[] => ['BEGIN:VEVENT', ...props, 'END:VEVENT']

function courseByName(courses: ImportedCourse[], name: string): ImportedCourse {
  const found = courses.find((c) => c.name === name)
  if (!found) throw new Error(`course not found: ${name}`)
  return found
}

describe('unfoldIcsLines', () => {
  it('joins CRLF space-folded lines, dropping exactly one leading space', () => {
    expect(unfoldIcsLines('SUMMARY:Hello\r\n  World')).toEqual(['SUMMARY:Hello World'])
  })

  it('joins tab-folded continuation lines', () => {
    expect(unfoldIcsLines('SUMMARY:AB\r\n\tCD')).toEqual(['SUMMARY:ABCD'])
  })

  it('handles LF and bare CR line endings', () => {
    expect(unfoldIcsLines('A:1\n B\rC:2')).toEqual(['A:1B', 'C:2'])
  })

  it('joins multiple consecutive continuation lines', () => {
    expect(unfoldIcsLines('A:12\r\n 34\r\n 56')).toEqual(['A:123456'])
  })

  it('keeps a continuation line with no preceding line as its own line', () => {
    expect(unfoldIcsLines(' X\r\nB:2')).toEqual([' X', 'B:2'])
  })

  it('leaves unfolded lines untouched', () => {
    expect(unfoldIcsLines('A:1\r\nB:2\r\nC:3')).toEqual(['A:1', 'B:2', 'C:3'])
  })
})

describe('translateSemesterName', () => {
  it('translates אביב with the year kept', () => {
    expect(translateSemesterName('אביב 2026')).toBe('Spring 2026')
  })

  it('translates חורף with a year range kept', () => {
    expect(translateSemesterName('חורף 2025-2026')).toBe('Winter 2025-2026')
  })

  it('translates קיץ', () => {
    expect(translateSemesterName('קיץ 2025')).toBe('Summer 2025')
  })

  it('passes English names through unchanged', () => {
    expect(translateSemesterName('Spring 2026')).toBe('Spring 2026')
    expect(translateSemesterName('Imported Semester')).toBe('Imported Semester')
  })
})

describe('parseIcs — cheesefork fixture', () => {
  const { courses, semesterHint } = parseIcs(icsFixture)

  it('finds the three courses in event order', () => {
    expect(courses.map((c) => c.name)).toEqual([
      'אלגוריתמים 1',
      'מבוא למערכות הפעלה',
      '236363 - תכנות מערכות',
    ])
  })

  it('extracts the semester hint from the Hebrew calendar name', () => {
    expect(semesterHint).toBe('Spring 2026')
  })

  it('aggregates schedule slots per course and dedupes repeated weekly events', () => {
    // Two identical Sunday lectures collapse into one slot; the tutorial adds a second.
    expect(courseByName(courses, 'אלגוריתמים 1').schedule).toEqual([
      { day: 0, start: '10:30', end: '12:30' },
      { day: 3, start: '14:30', end: '15:30' },
    ])
  })

  it('collects lecturers from descriptions, unfolded and unescaped', () => {
    expect(courseByName(courses, 'אלגוריתמים 1').lecturers).toEqual([
      "מרצה: פרופ' יובל רבני. הרצאה שבועית על מבני נתונים מתקדמים, חמדנות ותכנות דינמי.",
      'מתרגל: דניאל כהן',
    ])
  })

  it('collects unique locations', () => {
    expect(courseByName(courses, 'אלגוריתמים 1').locations).toEqual(['אולמן 305', 'טאוב 9'])
  })

  it('applies moed A with a Hebrew geresh and moed B with an apostrophe to the exact course', () => {
    expect(courseByName(courses, 'אלגוריתמים 1').exams).toEqual({
      moedA: '2026-07-01',
      moedB: '2026-08-01',
    })
  })

  it('applies an exam via partial name match in a second pass', () => {
    // Exam summary says "מבוא למערכות"; the course is "מבוא למערכות הפעלה".
    expect(courseByName(courses, 'מבוא למערכות הפעלה').exams).toEqual({
      moedA: '2026-07-03',
      moedB: '',
    })
  })

  it('reconstructs a course name folded across lines', () => {
    const course = courseByName(courses, 'מבוא למערכות הפעלה')
    expect(course.schedule).toEqual([{ day: 1, start: '09:30', end: '11:30' }])
    expect(course.lecturers).toEqual(['מרצה: ד"ר נועה לוי'])
    expect(course.locations).toEqual(['בניין אמאדו 233'])
  })

  it('keeps the numeric prefix in the name and leaves number empty', () => {
    const course = courseByName(courses, '236363 - תכנות מערכות')
    expect(course.number).toBe('')
    expect(course.schedule).toEqual([{ day: 2, start: '16:30', end: '18:30' }])
    expect(course.locations).toEqual(['טאוב 2'])
    expect(course.lecturers).toEqual([])
    expect(courses.every((c) => c.number === '')).toBe(true)
  })
})

describe('parseIcs — event filtering', () => {
  it('returns no courses and a null hint for empty or event-less input', () => {
    expect(parseIcs('')).toEqual({ courses: [], semesterHint: null })
    expect(parseIcs(ics([]))).toEqual({ courses: [], semesterHint: null })
  })

  it('skips events missing SUMMARY or DTSTART', () => {
    const text = ics([
      ...vevent('DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:הרצאה - קורס', 'DTEND:20260315T123000'),
    ])
    expect(parseIcs(text).courses).toEqual([])
  })

  it('skips non-exam events without DTEND', () => {
    const text = ics([...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000')])
    expect(parseIcs(text).courses).toEqual([])
  })

  it('uses the whole summary as the name when there is no " - " separator', () => {
    const text = ics([
      ...vevent('SUMMARY:סדנת רובוטיקה', 'DTSTART:20260315T103000', 'DTEND:20260315T113000'),
    ])
    expect(parseIcs(text).courses.map((c) => c.name)).toEqual(['סדנת רובוטיקה'])
  })

  it('keeps a summary with a dangling separator as the whole name', () => {
    // Property values are trimmed, so "הרצאה - " arrives as "הרצאה -" and the
    // " - " separator is not found.
    const text = ics([
      ...vevent('SUMMARY:הרצאה - ', 'DTSTART:20260315T103000', 'DTEND:20260315T113000'),
    ])
    expect(parseIcs(text).courses.map((c) => c.name)).toEqual(['הרצאה -'])
  })

  it('unescapes backslash sequences in text values', () => {
    const text = ics([
      ...vevent(
        'SUMMARY:הרצאה - קורס',
        'DTSTART:20260315T103000',
        'DTEND:20260315T123000',
        'DESCRIPTION:A\\;B\\NC\\\\D',
      ),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').lecturers).toEqual(['A;B\nC\\D'])
  })

  it('still records lecturer and location when the event dates are unparseable', () => {
    const text = ics([
      ...vevent(
        'SUMMARY:הרצאה - קורס',
        'DTSTART:invalid',
        'DTEND:20260315T123000',
        'DESCRIPTION:ד"ר אלמונית',
        'LOCATION:אולמן 100',
      ),
    ])
    const course = courseByName(parseIcs(text).courses, 'קורס')
    expect(course.schedule).toEqual([])
    expect(course.lecturers).toEqual(['ד"ר אלמונית'])
    expect(course.locations).toEqual(['אולמן 100'])
  })

  it('keeps slots with the same time on different days', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:תרגול - קורס', 'DTSTART:20260316T103000', 'DTEND:20260316T123000'),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').schedule).toEqual([
      { day: 0, start: '10:30', end: '12:30' },
      { day: 1, start: '10:30', end: '12:30' },
    ])
  })

  it('parses a DTSTART with a Z suffix as local time', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000Z', 'DTEND:20260315T123000Z'),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').schedule).toEqual([
      { day: 0, start: '10:30', end: '12:30' },
    ])
  })

  it('ignores a nested VALARM, keeping the event summary/description over the alarm', () => {
    const text = ics([
      ...vevent(
        'SUMMARY:הרצאה - אלגוריתמים 1',
        'DTSTART:20260315T103000',
        'DTEND:20260315T123000',
        'DESCRIPTION:מרצה: דניאל כהן',
        'LOCATION:טאוב 2',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Event reminder',
        'SUMMARY:Alarm notification',
        'TRIGGER:-PT30M',
        'END:VALARM',
      ),
    ])
    const course = courseByName(parseIcs(text).courses, 'אלגוריתמים 1')
    expect(course.lecturers).toEqual(['מרצה: דניאל כהן'])
    expect(course.locations).toEqual(['טאוב 2'])
    expect(course.schedule).toEqual([{ day: 0, start: '10:30', end: '12:30' }])
  })
})

describe('parseIcs — exam events', () => {
  it('handles a moed A summary without a dash via partial matching', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - אלגברה 1מ', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:מועד א אלגברה', 'DTSTART:20260710'),
    ])
    expect(courseByName(parseIcs(text).courses, 'אלגברה 1מ').exams.moedA).toBe('2026-07-10')
  })

  it('handles a moed B summary with a Hebrew geresh', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:מועד ב׳ - קורס', 'DTSTART;VALUE=DATE:20260810'),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').exams.moedB).toBe('2026-08-10')
  })

  it('prefers an exact course-name match over a partial one', () => {
    const text = ics([
      ...vevent(
        'SUMMARY:הרצאה - תורת הקבוצות מורחב',
        'DTSTART:20260315T103000',
        'DTEND:20260315T123000',
      ),
      ...vevent('SUMMARY:הרצאה - תורת הקבוצות', 'DTSTART:20260316T103000', 'DTEND:20260316T123000'),
      ...vevent('SUMMARY:מועד א - תורת הקבוצות', 'DTSTART:20260701'),
    ])
    const { courses } = parseIcs(text)
    expect(courseByName(courses, 'תורת הקבוצות').exams.moedA).toBe('2026-07-01')
    expect(courseByName(courses, 'תורת הקבוצות מורחב').exams.moedA).toBe('')
  })

  it('drops exams that match no schedule course', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:מועד א - אינפי 2', 'DTSTART:20260701'),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').exams).toEqual({ moedA: '', moedB: '' })
  })

  it('matches partially when the exam name contains the course name', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - חשבון 1', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:מועד א - חשבון 1 למדעי המחשב', 'DTSTART:20260701'),
    ])
    expect(courseByName(parseIcs(text).courses, 'חשבון 1').exams.moedA).toBe('2026-07-01')
  })

  it('treats a moed summary with an unparseable DTSTART as a regular event', () => {
    const text = ics([...vevent('SUMMARY:מועד א - חשבון', 'DTSTART:TBD', 'DTEND:20260315T123000')])
    const course = courseByName(parseIcs(text).courses, 'חשבון')
    expect(course.exams).toEqual({ moedA: '', moedB: '' })
    expect(course.schedule).toEqual([])
  })

  it('does not require DTEND for exam events', () => {
    const text = ics([
      ...vevent('SUMMARY:הרצאה - קורס', 'DTSTART:20260315T103000', 'DTEND:20260315T123000'),
      ...vevent('SUMMARY:מבחן מועד ב - קורס', 'DTSTART:20260805'),
    ])
    expect(courseByName(parseIcs(text).courses, 'קורס').exams.moedB).toBe('2026-08-05')
  })
})

describe('parseIcs — semester hint', () => {
  it('finds a season and year range in an event summary when the calendar has no name', () => {
    const text = ics([...vevent('SUMMARY:לוח מבחנים חורף 2025-2026', 'DTSTART:20260101')])
    expect(parseIcs(text).semesterHint).toBe('Winter 2025-2026')
  })

  it('prefers the calendar name over event summaries', () => {
    const text = ics([
      'X-WR-CALNAME:קיץ 2025',
      ...vevent('SUMMARY:חורף 2024-2025', 'DTSTART:20250101'),
    ])
    expect(parseIcs(text).semesterHint).toBe('Summer 2025')
  })

  it('returns null when a season appears without a year', () => {
    const text = ics(['X-WR-CALNAME:סמסטר אביב'])
    expect(parseIcs(text).semesterHint).toBeNull()
  })

  it('returns null when only English names appear', () => {
    const text = ics(['X-WR-CALNAME:Spring 2026 schedule'])
    expect(parseIcs(text).semesterHint).toBeNull()
  })
})
