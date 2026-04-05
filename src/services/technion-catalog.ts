/**
 * Technion SAP course catalog — fetches course metadata from the
 * `technion-sap-info-fetcher` GitHub Pages data source and enriches
 * local course objects with missing fields.
 */

import { TECHNION_SAP_BASE_URL } from '@/constants/api';
import type { Course } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Semester entry from the SAP `last_semesters.json` index. */
export interface SAPSemester {
  /** Academic year (e.g. 2024). */
  year: number;
  /** Semester code (e.g. 1 = Winter, 2 = Spring, 3 = Summer). */
  semester: number;
}

/** Raw SAP course general metadata (Hebrew keys). */
interface SAPCourseGeneral {
  'מספר מקצוע'?: string;
  'שם מקצוע'?: string;
  'נקודות'?: string;
  'אחראים'?: string;
  'פקולטה'?: string;
  'סילבוס'?: string;
}

/** A single entry in the SAP course data array. */
interface SAPCourseEntry {
  general: SAPCourseGeneral;
}

/** Parsed course metadata from the Technion SAP catalog. */
export interface CourseMetadata {
  /** Course catalog number. */
  courseNumber: string;
  /** Course name (Hebrew). */
  courseName: string;
  /** Credit points. */
  points: string;
  /** Responsible lecturer(s). */
  lecturer: string;
  /** Faculty name. */
  faculty: string;
  /** Syllabus text or URL. */
  syllabus: string;
}

/** Result of a catalog build operation. */
export interface CatalogBuildResult {
  /** Course number → metadata lookup. */
  catalog: Map<string, CourseMetadata>;
  /** Number of courses in the catalog. */
  size: number;
}

/** Result of enriching courses with catalog data. */
export interface EnrichmentResult {
  /** Number of courses that were updated. */
  updatedCount: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseSAPEntry(entry: SAPCourseEntry): CourseMetadata | null {
  const gen = entry.general;
  const courseNumber = gen['מספר מקצוע'];
  if (!courseNumber) return null;

  return {
    courseNumber,
    courseName: gen['שם מקצוע'] ?? '',
    points: gen['נקודות'] ?? '',
    lecturer: gen['אחראים'] ?? '',
    faculty: gen['פקולטה'] ?? '',
    syllabus: gen['סילבוס'] ?? '',
  };
}

/**
 * Finds a matching catalog entry for a local course.
 * Tries exact number match, partial number match, then name match.
 */
function findCatalogMatch(
  course: Course,
  catalog: Map<string, CourseMetadata>,
): CourseMetadata | null {
  const localNum = (course.number || '').replace(/\D/g, '');

  // Exact match by local number
  if (localNum) {
    const exact = catalog.get(localNum);
    if (exact) return exact;
  }

  // Partial match: catalog key ends with or contains the local number
  if (localNum && localNum.length >= 5) {
    for (const [key, meta] of catalog) {
      if (key.endsWith(localNum) || key.includes(localNum)) {
        return meta;
      }
    }
  }

  // Fallback: match by name (case-insensitive)
  if (course.name) {
    const localName = course.name.toLowerCase().trim();
    for (const meta of catalog.values()) {
      if (
        meta.courseName &&
        meta.courseName.toLowerCase().includes(localName)
      ) {
        return meta;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the list of available semesters from the SAP data source.
 *
 * @throws {Error} When the fetch fails or returns empty data.
 */
export async function fetchSemesterList(): Promise<SAPSemester[]> {
  const response = await fetch(TECHNION_SAP_BASE_URL + 'last_semesters.json');
  if (!response.ok) {
    throw new Error('Failed to fetch semester list.');
  }

  const semesters = (await response.json()) as SAPSemester[];
  if (!semesters || semesters.length === 0) {
    throw new Error('No semester data found.');
  }

  return semesters;
}

/**
 * Fetches course metadata for a single course by its catalog number.
 *
 * Used by CourseModal for auto-fill enrichment in Wave 12.
 *
 * Builds a catalog from all available semesters and looks up the course.
 *
 * @throws {Error} When the semester list can't be fetched or the course
 *   is not found in the catalog.
 */
export async function fetchCourseMetadata(
  courseId: string,
): Promise<CourseMetadata> {
  const semesters = await fetchSemesterList();
  const { catalog } = await buildCourseCatalog(semesters);

  const normalizedId = courseId.replace(/\D/g, '');
  const meta = catalog.get(normalizedId);

  if (!meta) {
    // Try partial match
    for (const [key, entry] of catalog) {
      if (key.endsWith(normalizedId) || key.includes(normalizedId)) {
        return entry;
      }
    }
    throw new Error(`Course ${courseId} not found in Technion catalog.`);
  }

  return meta;
}

/**
 * Builds a complete course catalog from SAP semester data.
 *
 * @param semesters Semester list (from {@link fetchSemesterList}).
 * @param onProgress Optional callback for progress reporting.
 * @returns The built catalog and its size.
 */
export async function buildCourseCatalog(
  semesters: SAPSemester[],
  onProgress?: (message: string) => void,
): Promise<CatalogBuildResult> {
  const catalog = new Map<string, CourseMetadata>();

  for (const sem of semesters) {
    const filename = `courses_${String(sem.year)}_${String(sem.semester)}.json`;
    onProgress?.(`Fetching data for ${String(sem.year)}-${String(sem.semester)}...`);

    try {
      const courseRes = await fetch(TECHNION_SAP_BASE_URL + filename);
      if (courseRes.ok) {
        const courses = (await courseRes.json()) as SAPCourseEntry[];
        for (const c of courses) {
          const meta = parseSAPEntry(c);
          if (meta) {
            catalog.set(meta.courseNumber, meta);
          }
        }
      }
    } catch {
      // Skip unavailable semester files
    }
  }

  return { catalog, size: catalog.size };
}

/**
 * Enriches a single course with metadata from the catalog, filling in
 * only fields that are currently empty.
 *
 * Used internally by enrichCoursesWithCatalog; exported for CourseModal in Wave 12.
 *
 * Returns a new course object (does not mutate the input).
 */
export function enrichCourseWithMetadata(
  course: Course,
  metadata: CourseMetadata,
): Course {
  const enriched = { ...course };
  let changed = false;

  if (!enriched.points && metadata.points) {
    enriched.points = metadata.points;
    changed = true;
  }
  if (!enriched.lecturer && metadata.lecturer) {
    enriched.lecturer = metadata.lecturer;
    changed = true;
  }
  if (!enriched.faculty && metadata.faculty) {
    enriched.faculty = metadata.faculty;
    changed = true;
  }
  if (!enriched.syllabus && metadata.syllabus) {
    enriched.syllabus = metadata.syllabus;
    changed = true;
  }
  if (!enriched.number && metadata.courseNumber) {
    enriched.number = metadata.courseNumber;
    changed = true;
  }

  return changed ? enriched : course;
}

/**
 * Enriches an array of courses with catalog data, returning the updated
 * courses and a count of how many were modified.
 */
export function enrichCoursesWithCatalog(
  courses: readonly Course[],
  catalog: Map<string, CourseMetadata>,
): { courses: Course[]; updatedCount: number } {
  let updatedCount = 0;

  const enrichedCourses = courses.map((course) => {
    const match = findCatalogMatch(course, catalog);
    if (match) {
      const enriched = enrichCourseWithMetadata(course, match);
      if (enriched !== course) updatedCount++;
      return enriched;
    }
    return course;
  });

  return { courses: enrichedCourses, updatedCount };
}
