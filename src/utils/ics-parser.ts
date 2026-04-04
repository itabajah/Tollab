/**
 * ICS (iCalendar) file parser — extracts course schedule and exam data
 * from Cheesefork-style ICS content.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single schedule slot parsed from an ICS recurring event. */
export interface ParsedICSScheduleSlot {
  /** Day of the week (0 = Sunday … 6 = Saturday). */
  day: number;
  /** Start time in `"HH:MM"` format. */
  start: string;
  /** End time in `"HH:MM"` format. */
  end: string;
}

/** A fully parsed course extracted from ICS content. */
export interface ParsedICSEvent {
  /** Course display name. */
  name: string;
  /** Course catalog number (may be empty). */
  number: string;
  /** Comma-separated lecturer names. */
  lecturer: string;
  /** Comma-separated locations. */
  location: string;
  /** Weekly schedule entries. */
  schedule: ParsedICSScheduleSlot[];
  /** Moed A exam date in `"YYYY-MM-DD"` format, or empty string. */
  moedA: string;
  /** Moed B exam date in `"YYYY-MM-DD"` format, or empty string. */
  moedB: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RawEventData {
  SUMMARY?: string;
  DESCRIPTION?: string;
  LOCATION?: string;
  DTSTART?: string;
  DTEND?: string;
}

interface ExamInfo {
  courseName: string;
  examType: 'moedA' | 'moedB';
  date: string;
}

interface CourseAccumulator {
  name: string;
  number: string;
  lecturers: Set<string>;
  locations: Set<string>;
  schedule: ParsedICSScheduleSlot[];
  moedA: string;
  moedB: string;
}

const ICS_FIELDS = new Set([
  'SUMMARY',
  'DESCRIPTION',
  'LOCATION',
  'DTSTART',
  'DTEND',
]);

function parseICSEventBlock(eventBlock: string): RawEventData {
  const lines = eventBlock.split(/\r\n|\n|\r/);
  const data: RawEventData = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).split(';')[0]!;
    const value = line.substring(colonIdx + 1).trim();

    if (ICS_FIELDS.has(key)) {
      (data as Record<string, string>)[key] = value;
    }
  }

  return data;
}

function parseICSDateLocal(dateStr: string): Date {
  const cleanStr = dateStr.replace(/Z$/, '');

  const year = parseInt(cleanStr.substring(0, 4), 10);
  const month = parseInt(cleanStr.substring(4, 6), 10) - 1;
  const day = parseInt(cleanStr.substring(6, 8), 10);
  const hour = parseInt(cleanStr.substring(9, 11), 10) || 0;
  const minute = parseInt(cleanStr.substring(11, 13), 10) || 0;
  const second = parseInt(cleanStr.substring(13, 15), 10) || 0;

  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  return new Date(year, month, day, hour, minute, second);
}

function formatTimeFromDate(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseExamEvent(data: RawEventData): ExamInfo | null {
  if (!data.SUMMARY) return null;

  const examAMatch = data.SUMMARY.match(/מועד א['׳]?\s*[-–]?\s*(.+)/);
  const examBMatch = data.SUMMARY.match(/מועד ב['׳]?\s*[-–]?\s*(.+)/);

  if (!examAMatch && !examBMatch) return null;

  const courseName = ((examAMatch ?? examBMatch)![1] as string).trim();
  const examType: 'moedA' | 'moedB' = examAMatch ? 'moedA' : 'moedB';

  const dateMatch = data.DTSTART?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!dateMatch) return null;

  return {
    courseName,
    examType,
    date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
  };
}

function parseScheduleEntry(
  data: RawEventData,
): ParsedICSScheduleSlot | null {
  if (!data.DTSTART || !data.DTEND) return null;

  const startDate = parseICSDateLocal(data.DTSTART);
  const endDate = parseICSDateLocal(data.DTEND);

  return {
    day: startDate.getDay(),
    start: formatTimeFromDate(startDate),
    end: formatTimeFromDate(endDate),
  };
}

function isDuplicateSchedule(
  schedule: ParsedICSScheduleSlot[],
  entry: ParsedICSScheduleSlot,
): boolean {
  return schedule.some(
    (s) => s.day === entry.day && s.start === entry.start && s.end === entry.end,
  );
}

function processScheduleEvent(
  courseMap: Map<string, CourseAccumulator>,
  data: RawEventData,
): void {
  if (!data.SUMMARY) return;

  const separatorIndex = data.SUMMARY.indexOf(' - ');
  const name =
    separatorIndex !== -1
      ? data.SUMMARY.substring(separatorIndex + 3).trim()
      : data.SUMMARY.trim();

  if (!courseMap.has(name)) {
    courseMap.set(name, {
      name,
      number: '',
      lecturers: new Set(),
      locations: new Set(),
      schedule: [],
      moedA: '',
      moedB: '',
    });
  }

  const course = courseMap.get(name)!;
  if (data.DESCRIPTION) course.lecturers.add(data.DESCRIPTION);
  if (data.LOCATION) course.locations.add(data.LOCATION);

  try {
    const scheduleEntry = parseScheduleEntry(data);
    if (scheduleEntry && !isDuplicateSchedule(course.schedule, scheduleEntry)) {
      course.schedule.push(scheduleEntry);
    }
  } catch {
    // Skip unparseable schedule entries
  }
}

function applyExamDates(
  courseMap: Map<string, CourseAccumulator>,
  examDates: ExamInfo[],
): void {
  for (const exam of examDates) {
    let course = courseMap.get(exam.courseName);

    // Try partial match if exact match fails
    if (!course) {
      for (const [name, c] of courseMap) {
        if (name.includes(exam.courseName) || exam.courseName.includes(name)) {
          course = c;
          break;
        }
      }
    }

    if (course) {
      course[exam.examType] = exam.date;
    }
  }
}

function formatCourseMap(
  courseMap: Map<string, CourseAccumulator>,
): ParsedICSEvent[] {
  return Array.from(courseMap.values()).map((c) => ({
    name: c.name,
    number: c.number,
    lecturer: Array.from(c.lecturers).join(', '),
    location: Array.from(c.locations).join(', '),
    schedule: c.schedule,
    moedA: c.moedA,
    moedB: c.moedB,
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses raw ICS (iCalendar) text and returns an array of parsed course
 * objects with schedule slots, exam dates, lecturers, and locations.
 *
 * The parser handles:
 * - `BEGIN:VEVENT` / `END:VEVENT` blocks
 * - Hebrew exam labels (מועד א / מועד ב)
 * - Duplicate schedule deduplication
 * - Partial course-name matching for exam assignment
 */
export function parseICS(icsText: string): ParsedICSEvent[] {
  const courseMap = new Map<string, CourseAccumulator>();
  const examDates: ExamInfo[] = [];
  const events = icsText.split('BEGIN:VEVENT');

  for (const eventBlock of events) {
    if (!eventBlock.includes('END:VEVENT')) continue;

    const data = parseICSEventBlock(eventBlock);
    if (!data.SUMMARY || !data.DTSTART) continue;

    const examInfo = parseExamEvent(data);
    if (examInfo) {
      examDates.push(examInfo);
      continue;
    }

    // Regular schedule event — requires DTEND
    if (!data.DTEND) continue;

    processScheduleEvent(courseMap, data);
  }

  applyExamDates(courseMap, examDates);

  return formatCourseMap(courseMap);
}
