import { v4 as uuid } from 'uuid';
import { AppData, Course, Semester, ExportData, DEFAULT_CALENDAR_SETTINGS } from '@/types';
import { validateAppData } from './validation';

// ============================================
// Export Functions
// ============================================

export function exportToJson(data: AppData, profileName: string): string {
  const exportData: ExportData = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    profile: profileName,
    data,
  };

  return JSON.stringify(exportData, null, 2);
}

export function downloadJson(data: AppData, profileName: string, filename?: string): void {
  const json = exportToJson(data, profileName);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `tollab-${profileName}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// Import Functions
// ============================================

export interface ImportResult {
  success: boolean;
  message: string;
  data?: Partial<AppData>;
}

export async function importFromJson(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Check if it's a Tollab export file
    if (parsed.version && parsed.data) {
      const validationResult = validateAppData(parsed.data);
      if (validationResult.success && validationResult.data) {
        return {
          success: true,
          message: 'ייבוא הקובץ הצליח',
          data: validationResult.data as AppData,
        };
      } else {
        return {
          success: false,
          message: 'הקובץ מכיל נתונים לא תקינים',
        };
      }
    }

    // Try to validate as raw AppData
    const validationResult = validateAppData(parsed);
    if (validationResult.success && validationResult.data) {
      return {
        success: true,
        message: 'ייבוא הקובץ הצליח',
        data: validationResult.data as AppData,
      };
    }

    return {
      success: false,
      message: 'פורמט הקובץ לא מזוהה',
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      message: 'שגיאה בקריאת הקובץ',
    };
  }
}

// ============================================
// ICS (Cheesefork) Import Functions
// ============================================

interface ICSEvent {
  summary: string;
  location: string;
  dtstart: Date;
  dtend: Date;
  rrule?: {
    byday: string[];
  };
  description?: string;
}

function parseICSDate(icsDate: string): Date {
  // Handle both date-time and date-only formats
  if (icsDate.includes('T')) {
    // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const year = parseInt(icsDate.substring(0, 4));
    const month = parseInt(icsDate.substring(4, 6)) - 1;
    const day = parseInt(icsDate.substring(6, 8));
    const hour = parseInt(icsDate.substring(9, 11));
    const minute = parseInt(icsDate.substring(11, 13));
    return new Date(year, month, day, hour, minute);
  } else {
    // YYYYMMDD
    const year = parseInt(icsDate.substring(0, 4));
    const month = parseInt(icsDate.substring(4, 6)) - 1;
    const day = parseInt(icsDate.substring(6, 8));
    return new Date(year, month, day);
  }
}

function parseRRule(rrule: string): { byday: string[] } | null {
  const match = rrule.match(/BYDAY=([^;]+)/);
  if (match) {
    return { byday: match[1].split(',') };
  }
  return null;
}

function dayNameToNumber(dayName: string): number {
  const days: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };
  return days[dayName] ?? 0;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseICS(icsContent: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = icsContent.replace(/\r\n /g, '').split(/\r?\n/);

  let currentEvent: Partial<ICSEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).split(';')[0];
        const value = line.substring(colonIndex + 1);

        switch (key) {
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'LOCATION':
            currentEvent.location = value;
            break;
          case 'DTSTART':
            currentEvent.dtstart = parseICSDate(value);
            break;
          case 'DTEND':
            currentEvent.dtend = parseICSDate(value);
            break;
          case 'RRULE':
            currentEvent.rrule = parseRRule(value) || undefined;
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
        }
      }
    }
  }

  return events;
}

export function icsEventsToSemester(events: ICSEvent[], semesterName: string): Semester {
  const coursesMap = new Map<string, Course>();

  for (const event of events) {
    // Parse course name and type from summary
    // Format: "Course Name - סוג" or just "Course Name"
    const parts = event.summary.split(' - ');
    const courseName = parts[0].trim();
    const eventType = parts[1]?.trim() || '';

    // Get or create course
    if (!coursesMap.has(courseName)) {
      coursesMap.set(courseName, {
        id: uuid(),
        name: courseName,
        color: '',
        number: '',
        points: '',
        lecturer: '',
        faculty: '',
        location: event.location || '',
        grade: '',
        syllabus: '',
        notes: '',
        exams: { moedA: '', moedB: '' },
        schedule: [],
        homework: [],
        recordings: {
          tabs: [
            { id: 'lectures', name: 'הרצאות', items: [] },
            { id: 'tutorials', name: 'תרגולים', items: [] },
          ],
        },
      });
    }

    const course = coursesMap.get(courseName)!;

    // Determine schedule type
    let scheduleType: 'lecture' | 'tutorial' | 'lab' | 'other' = 'lecture';
    if (eventType.includes('תרגול') || eventType.includes('תרגיל')) {
      scheduleType = 'tutorial';
    } else if (eventType.includes('מעבדה')) {
      scheduleType = 'lab';
    }

    // Add schedule items
    if (event.rrule?.byday) {
      for (const dayCode of event.rrule.byday) {
        course.schedule.push({
          id: uuid(),
          day: dayNameToNumber(dayCode),
          start: formatTime(event.dtstart),
          end: formatTime(event.dtend),
          type: scheduleType,
          location: event.location,
        });
      }
    } else {
      // Single occurrence - use the day from dtstart
      course.schedule.push({
        id: uuid(),
        day: event.dtstart.getDay(),
        start: formatTime(event.dtstart),
        end: formatTime(event.dtend),
        type: scheduleType,
        location: event.location,
      });
    }
  }

  return {
    id: uuid(),
    name: semesterName,
    courses: Array.from(coursesMap.values()),
    calendarSettings: { ...DEFAULT_CALENDAR_SETTINGS },
  };
}

export async function importFromICS(file: File, semesterName: string): Promise<ImportResult> {
  try {
    const text = await file.text();
    const events = parseICS(text);

    if (events.length === 0) {
      return {
        success: false,
        message: 'לא נמצאו אירועים בקובץ',
      };
    }

    const semester = icsEventsToSemester(events, semesterName);

    return {
      success: true,
      message: `יובאו ${semester.courses.length} קורסים`,
      data: {
        semesters: [semester],
      },
    };
  } catch (error) {
    console.error('ICS import error:', error);
    return {
      success: false,
      message: 'שגיאה בקריאת קובץ ICS',
    };
  }
}

// ============================================
// Cheesefork URL Import
// ============================================

const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithCorsProxy(url: string): Promise<string> {
  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const response = await fetch(getProxyUrl(url));
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('CORS proxy failed:', error);
    }
  }
  throw new Error('All CORS proxies failed');
}

export async function importFromCheeseforkUrl(
  url: string,
  semesterName: string
): Promise<ImportResult> {
  try {
    // Validate URL format
    if (!url.includes('cheesefork') && !url.endsWith('.ics')) {
      return {
        success: false,
        message: 'כתובת לא תקינה. יש להשתמש בקישור מ-Cheesefork',
      };
    }

    const icsContent = await fetchWithCorsProxy(url);
    const events = parseICS(icsContent);

    if (events.length === 0) {
      return {
        success: false,
        message: 'לא נמצאו אירועים בקובץ',
      };
    }

    const semester = icsEventsToSemester(events, semesterName);

    return {
      success: true,
      message: `יובאו ${semester.courses.length} קורסים`,
      data: {
        semesters: [semester],
      },
    };
  } catch (error) {
    console.error('Cheesefork import error:', error);
    return {
      success: false,
      message: 'שגיאה בייבוא מ-Cheesefork',
    };
  }
}
