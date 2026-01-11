/**
 * Cheesefork API Integration
 * 
 * Fetches course data and semester information from Cheesefork
 * - Course catalog with schedules, points, faculty, exam dates
 * - Available semesters with start/end dates
 */

// CORS proxies for fetching data
const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://corsproxy.org/?',
  'https://api.allorigins.win/raw?url=',
];

// Base URLs
const SAP_BASE_URL = 'https://sap.cheesefork.cf';
const SAP_INFO_URL = 'https://michael-maltsev.github.io/technion-sap-info-fetcher';

// Types
export interface CheeseforkCourse {
  courseNumber: string;
  name: string;
  nameHe: string;
  points: number;
  faculty: string;
  facultyHe: string;
  lecturer?: string;
  moedA?: string;
  moedB?: string;
  schedule: CheeseforkScheduleItem[];
}

export interface CheeseforkScheduleItem {
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  type: 'lecture' | 'tutorial' | 'lab' | 'other';
  typeHe: string;
  location?: string;
  group?: string;
  lecturer?: string;
}

export interface CheeseforkSemester {
  code: string; // e.g., "202501"
  name: string; // e.g., "Winter 2025/2026"
  nameHe: string; // e.g., "חורף 2025/2026"
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  year: number;
  season: 'winter' | 'spring' | 'summer';
}

export interface SemesterInfo {
  year: number;
  semester: number; // 200=Winter, 201=Spring, 202=Summer (SAP format)
  start: string;
  end: string;
}

// Hebrew day names for parsing
const HEBREW_DAYS: Record<string, number> = {
  'א': 0, // Sunday
  'ב': 1,
  'ג': 2,
  'ד': 3,
  'ה': 4,
  'ו': 5,
  'ש': 6,
};

// Lesson type mapping
const LESSON_TYPES: Record<string, { type: CheeseforkScheduleItem['type']; en: string }> = {
  'הרצאה': { type: 'lecture', en: 'Lecture' },
  'תרגול': { type: 'tutorial', en: 'Tutorial' },
  'מעבדה': { type: 'lab', en: 'Lab' },
  'סמינר': { type: 'other', en: 'Seminar' },
  'פרויקט': { type: 'other', en: 'Project' },
};

/**
 * Fetch with CORS proxy fallback
 */
async function fetchWithCors(url: string): Promise<string> {
  // Try direct fetch first
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Direct fetch failed, try proxies
  }

  // Try each proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to fetch ${url} with all proxies`);
}

/**
 * Convert semester code to human-readable format
 * Code format: YYYYSS where SS is 01=Winter, 02=Spring, 03=Summer
 */
export function formatSemesterCode(code: string, locale: 'en' | 'he' | 'ar' = 'en'): string {
  const year = parseInt(code.slice(0, 4), 10);
  const seasonCode = code.slice(4);

  const seasons: Record<string, Record<string, string>> = {
    '01': { en: 'Winter', he: 'חורף', ar: 'شتاء' },
    '02': { en: 'Spring', he: 'אביב', ar: 'ربيع' },
    '03': { en: 'Summer', he: 'קיץ', ar: 'صيف' },
  };

  const season = seasons[seasonCode]?.[locale] || seasons[seasonCode]?.en || code;

  if (seasonCode === '01') {
    return `${season} ${year}/${year + 1}`;
  } else {
    return `${season} ${year}/${year + 1}`;
  }
}

/**
 * Get the current semester code based on date
 */
export function getCurrentSemesterCode(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Winter: Oct-Feb
  // Spring: Mar-Jun
  // Summer: Jul-Sep
  if (month >= 10 || month <= 2) {
    const semesterYear = month >= 10 ? year : year - 1;
    return `${semesterYear}01`;
  } else if (month >= 3 && month <= 6) {
    return `${year - 1}02`;
  } else {
    return `${year - 1}03`;
  }
}

/**
 * Fetch available semesters from Cheesefork
 */
export async function fetchAvailableSemesters(): Promise<CheeseforkSemester[]> {
  try {
    const response = await fetchWithCors(`${SAP_INFO_URL}/last_semesters.json`);
    const data: SemesterInfo[] = JSON.parse(response);

    return data.map((sem) => {
      // Convert SAP semester format (200=Winter, 201=Spring, 202=Summer) to our format
      const seasonCode = String(sem.semester - 200 + 1).padStart(2, '0');
      const code = `${sem.year}${seasonCode}`;
      const season: CheeseforkSemester['season'] = seasonCode === '01' ? 'winter' : seasonCode === '02' ? 'spring' : 'summer';

      return {
        code,
        name: formatSemesterCode(code, 'en'),
        nameHe: formatSemesterCode(code, 'he'),
        start: sem.start,
        end: sem.end,
        year: sem.year,
        season,
      };
    }).sort((a, b) => b.code.localeCompare(a.code)); // Sort descending (newest first)
  } catch (error) {
    console.error('Failed to fetch semesters:', error);
    return [];
  }
}

/**
 * Parse the Cheesefork courses JavaScript file
 * The file sets a global variable `courses_from_rishum` with all course data
 */
function parseCoursesJs(js: string): CheeseforkCourse[] {
  const courses: CheeseforkCourse[] = [];

  try {
    // Extract the courses array from the JS
    // Format: var courses_from_rishum = [...];
    const match = js.match(/var\s+courses_from_rishum\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      console.error('Could not find courses_from_rishum in JS');
      return [];
    }

    // Parse the JSON-like array
    // eslint-disable-next-line no-eval
    const rawCourses = eval(match[1]);

    for (const raw of rawCourses) {
      const general = raw.general || {};
      const schedule = raw.schedule || [];

      const courseNumber = general['מספר מקצוע'] || '';
      const name = general['שם מקצוע'] || '';
      const points = parseFloat(general['נקודות'] || '0');
      const faculty = general['פקולטה'] || '';

      // Parse schedule items
      const scheduleItems: CheeseforkScheduleItem[] = [];

      for (const lesson of schedule) {
        const dayStr = lesson['יום'];
        const timeStr = lesson['שעה'] || '';
        const typeStr = lesson['סוג'] || '';
        const building = lesson['בניין'] || '';
        const room = lesson['חדר'] || '';
        const group = lesson['קבוצה'] || '';
        const lecturer = lesson['מרצה/מתרגל'] || '';

        // Parse day
        const day = dayStr ? HEBREW_DAYS[dayStr.charAt(0)] ?? -1 : -1;
        if (day === -1) continue;

        // Parse time (format: "08:30-10:30" or similar)
        const timeParts = timeStr.split('-').map((t: string) => t.trim());
        if (timeParts.length !== 2) continue;

        const startTime = timeParts[0];
        const endTime = timeParts[1];

        // Parse type
        const typeInfo = LESSON_TYPES[typeStr] || { type: 'other', en: typeStr };

        scheduleItems.push({
          day,
          startTime,
          endTime,
          type: typeInfo.type,
          typeHe: typeStr,
          location: building && room ? `${building} ${room}` : building || room || undefined,
          group: group || undefined,
          lecturer: lecturer || undefined,
        });
      }

      // Parse exam dates
      const moedA = general['מועד א'] || '';
      const moedB = general['מועד ב'] || '';

      courses.push({
        courseNumber,
        name,
        nameHe: name, // Same as name (already in Hebrew)
        points,
        faculty,
        facultyHe: faculty,
        moedA: moedA || undefined,
        moedB: moedB || undefined,
        schedule: scheduleItems,
      });
    }
  } catch (error) {
    console.error('Failed to parse courses JS:', error);
  }

  return courses;
}

/**
 * Fetch courses for a specific semester
 */
export async function fetchCourses(semesterCode: string): Promise<CheeseforkCourse[]> {
  try {
    // Convert semester code to SAP format
    const year = semesterCode.slice(0, 4);
    const seasonCode = parseInt(semesterCode.slice(4), 10);
    const sapSemester = seasonCode - 1 + 200; // 01 -> 200, 02 -> 201, 03 -> 202

    const url = `${SAP_BASE_URL}/courses_${year}_${sapSemester}.min.js`;
    const js = await fetchWithCors(url);
    
    return parseCoursesJs(js);
  } catch (error) {
    console.error(`Failed to fetch courses for semester ${semesterCode}:`, error);
    return [];
  }
}

/**
 * Search courses by name or number
 */
export function searchCourses(
  courses: CheeseforkCourse[],
  query: string,
  limit: number = 50
): CheeseforkCourse[] {
  const normalizedQuery = query.trim().toLowerCase();
  
  if (!normalizedQuery) return [];

  const results: Array<{ course: CheeseforkCourse; score: number }> = [];

  for (const course of courses) {
    let score = 0;

    // Exact course number match
    if (course.courseNumber === normalizedQuery) {
      score = 100;
    }
    // Course number starts with query
    else if (course.courseNumber.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Course number contains query
    else if (course.courseNumber.includes(normalizedQuery)) {
      score = 60;
    }
    // Name exact match (case insensitive)
    else if (course.name.toLowerCase() === normalizedQuery) {
      score = 90;
    }
    // Name starts with query
    else if (course.name.toLowerCase().startsWith(normalizedQuery)) {
      score = 70;
    }
    // Name contains query
    else if (course.name.toLowerCase().includes(normalizedQuery)) {
      score = 50;
    }

    if (score > 0) {
      results.push({ course, score });
    }
  }

  // Sort by score descending, then by course number
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.course.courseNumber.localeCompare(b.course.courseNumber);
  });

  return results.slice(0, limit).map((r) => r.course);
}

// Faculty mapping for Technion
export const TECHNION_FACULTIES: Record<string, { en: string; he: string; ar: string }> = {
  cs: { en: 'Computer Science', he: 'מדעי המחשב', ar: 'علوم الحاسوب' },
  ee: { en: 'Electrical & Computer Engineering', he: 'הנדסת חשמל ומחשבים', ar: 'الهندسة الكهربائية' },
  me: { en: 'Mechanical Engineering', he: 'הנדסת מכונות', ar: 'الهندسة الميكانيكية' },
  ce: { en: 'Civil & Environmental Engineering', he: 'הנדסה אזרחית וסביבתית', ar: 'الهندسة المدنية' },
  arch: { en: 'Architecture & Town Planning', he: 'אדריכלות ובינוי ערים', ar: 'الهندسة المعمارية' },
  chem: { en: 'Chemistry', he: 'כימיה', ar: 'الكيمياء' },
  physics: { en: 'Physics', he: 'פיזיקה', ar: 'الفيزياء' },
  math: { en: 'Mathematics', he: 'מתמטיקה', ar: 'الرياضيات' },
  biology: { en: 'Biology', he: 'ביולוגיה', ar: 'الأحياء' },
  medicine: { en: 'Medicine', he: 'רפואה', ar: 'الطب' },
  aerospace: { en: 'Aerospace Engineering', he: 'הנדסת אוירונוטיקה וחלל', ar: 'هندسة الطيران والفضاء' },
  ie: { en: 'Industrial Engineering & Management', he: 'הנדסת תעשייה וניהול', ar: 'الهندسة الصناعية' },
  materials: { en: 'Materials Science & Engineering', he: 'הנדסת חומרים', ar: 'هندسة المواد' },
  biomedical: { en: 'Biomedical Engineering', he: 'הנדסה ביו-רפואית', ar: 'الهندسة الطبية الحيوية' },
  education: { en: 'Education in Science & Technology', he: 'הוראת המדעים והטכנולוגיה', ar: 'التربية' },
  humanities: { en: 'Humanities & Arts', he: 'מדעי הרוח והאמנויות', ar: 'العلوم الإنسانية والفنون' },
  management: { en: 'Industrial Engineering & Management', he: 'הנדסת תעשייה וניהול', ar: 'الإدارة' },
  chemical: { en: 'Chemical Engineering', he: 'הנדסה כימית', ar: 'الهندسة الكيميائية' },
  food: { en: 'Biotechnology & Food Engineering', he: 'ביוטכנולוגיה והנדסת מזון', ar: 'هندسة التقنيات الحيوية والغذاء' },
};
