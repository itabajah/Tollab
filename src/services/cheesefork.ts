/**
 * Cheesefork ICS import — fetches and parses ICS calendar files from
 * Cheesefork URLs, with optional JSON metadata enrichment and batch import.
 */

import { SEMESTER_TRANSLATIONS } from '@/constants/semesters';
import { parseICS } from '@/utils/ics-parser';
import type { ParsedICSEvent } from '@/utils/ics-parser';
import { fetchViaProxy } from '@/services/cors-proxy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A semester with its parsed courses from an ICS import. */
export interface ImportedSemester {
  /** Display name for the semester (e.g. "Winter 2024-2025"). */
  semesterName: string;
  /** Parsed courses with schedule and exam data. */
  courses: ParsedICSEvent[];
}

/** Result of a single ICS import operation. */
export interface ImportResult {
  /** The source URL that was imported. */
  url: string;
  /** Whether the import succeeded. */
  success: boolean;
  /** Semester name (present on success). */
  semesterName?: string;
  /** Number of courses imported (present on success). */
  count?: number;
  /** Error message (present on failure). */
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Translates Hebrew semester season names to English.
 * Uses the canonical translation map from constants.
 */
function translateSemesterName(name: string): string {
  let result = name;
  for (const [hebrew, english] of Object.entries(SEMESTER_TRANSLATIONS)) {
    result = result.replace(hebrew, english);
  }
  return result;
}

/**
 * Extracts a semester name from an ICS URL filename.
 * e.g. `/winter-2024-2025.ics` → `"Winter 2024-2025"`
 */
function extractSemesterFromUrl(url: string): string {
  const filenameMatch = url.match(/\/([^/]+)\.ics$/);
  if (filenameMatch?.[1]) {
    return filenameMatch[1].replace(
      /^([a-z]+)-/,
      (_, season: string) =>
        season.charAt(0).toUpperCase() + season.slice(1) + ' ',
    );
  }
  return 'Imported Semester';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches an ICS file (or its JSON counterpart) via CORS proxy and parses
 * it into semester/course data.
 *
 * Cheesefork-specific: tries `<url>.json` first for richer metadata
 * (course numbers, points, lecturer), falling back to raw ICS parsing.
 *
 * @param url ICS file URL (e.g. from Cheesefork).
 * @param semesterNameOverride Optional explicit semester name.
 * @returns Parsed semester with courses.
 * @throws {Error} When fetching or parsing fails.
 */
export async function fetchICSData(
  url: string,
  semesterNameOverride?: string,
): Promise<ImportedSemester> {
  // Try JSON version first (Cheesefork-specific) for full metadata
  const jsonUrl = url.replace(/\.ics$/i, '.json');

  try {
    const jsonResult = await fetchViaProxy(jsonUrl);
    const data: unknown = JSON.parse(jsonResult.text);

    if (typeof data === 'object' && data !== null) {
      const dataObj = data as Record<string, unknown>;
      const coursesRaw = Array.isArray(data)
        ? (data as ParsedICSEvent[])
        : Array.isArray(dataObj['courses'])
          ? (dataObj['courses'] as ParsedICSEvent[])
          : null;
      const semesterName =
        semesterNameOverride ??
        (typeof dataObj['semester'] === 'string'
          ? translateSemesterName(dataObj['semester'])
          : 'Imported Semester');

      if (coursesRaw && coursesRaw.length > 0) {
        return { semesterName, courses: coursesRaw };
      }
    }
  } catch {
    // JSON fetch failed — proceed to ICS fallback
  }

  // Fallback: fetch and parse raw ICS
  const icsResult = await fetchViaProxy(url);
  if (!icsResult.text) {
    throw new Error('Failed to fetch calendar file.');
  }

  const semesterName =
    semesterNameOverride ?? extractSemesterFromUrl(url);

  const courses = parseICS(icsResult.text);
  if (courses.length === 0) {
    throw new Error('No courses found in the calendar file.');
  }

  return { semesterName, courses };
}

/**
 * Parses raw ICS text into an {@link ImportedSemester}.
 *
 * Use this when you already have the ICS content (e.g. from a file input)
 * and don't need to fetch it.
 *
 * @param icsText Raw ICS file content.
 * @param semesterName Display name for the resulting semester.
 * @returns Parsed semester with courses.
 * @throws {Error} When no courses are found.
 */
export function parseICSToSemesters(
  icsText: string,
  semesterName: string = 'Imported Semester',
): ImportedSemester {
  const translatedName = translateSemesterName(semesterName);
  const courses = parseICS(icsText);

  if (courses.length === 0) {
    throw new Error('No courses found in the calendar file.');
  }

  return { semesterName: translatedName, courses };
}

/**
 * Batch-imports multiple ICS URLs, returning individual results for each.
 *
 * Each URL is processed independently — failures don't block other imports.
 */
export async function batchImportSemesters(
  urls: string[],
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  for (const url of urls) {
    try {
      const { semesterName, courses } = await fetchICSData(url);
      results.push({
        url,
        success: true,
        semesterName,
        count: courses.length,
      });
    } catch (error: unknown) {
      const raw =
        error instanceof Error ? error.message : 'Unknown import error';
      const message = raw.split('\n')[0]?.replace(/https?:\/\/\S+/g, '[url]') ?? 'Import failed';
      results.push({
        url,
        success: false,
        error: message,
      });
    }
  }

  return results;
}
