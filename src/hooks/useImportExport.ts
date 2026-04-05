/**
 * Hook for import/export operations — wraps service calls with loading states,
 * progress tracking, error handling, and toast notifications.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { DEFAULT_CALENDAR_SETTINGS, DEFAULT_RECORDING_TABS, GOLDEN_ANGLE } from '@/constants';
import { fetchICSData } from '@/services/cheesefork';
import type { ImportedSemester, ImportResult } from '@/services/cheesefork';
import {
  buildCourseCatalog,
  enrichCoursesWithCatalog,
  fetchSemesterList,
} from '@/services/technion-catalog';

import { useAppStore } from '@/store/app-store';
import type { Course, Semester } from '@/types';
import type { ParsedICSEvent } from '@/utils/ics-parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a parsed ICS event into a full Course object. */
function icsEventToCourse(event: ParsedICSEvent, index: number): Course {
  return {
    id: crypto.randomUUID(),
    name: event.name,
    number: event.number,
    points: '',
    lecturer: event.lecturer,
    faculty: '',
    location: event.location,
    grade: '',
    color: `hsl(${String((index * GOLDEN_ANGLE) % 360)}, 45%, 50%)`,
    syllabus: '',
    notes: '',
    exams: { moedA: event.moedA, moedB: event.moedB },
    schedule: event.schedule.map((s) => ({
      day: s.day,
      start: s.start,
      end: s.end,
    })),
    homework: [],
    recordings: {
      tabs: DEFAULT_RECORDING_TABS.map((t) => ({ ...t, items: [] })),
    },
  };
}

/** Converts an ImportedSemester (from cheesefork service) into a Semester. */
function importedSemesterToSemester(imported: ImportedSemester): Semester {
  return {
    id: crypto.randomUUID(),
    name: imported.semesterName,
    courses: imported.courses.map((c, i) => icsEventToCourse(c, i)),
    calendarSettings: { ...DEFAULT_CALENDAR_SETTINGS },
  };
}

const SEASON_ORDER = ['winter', 'spring', 'summer'] as const;

/**
 * Generates batch ICS URLs for a semester range by replacing the
 * season-year filename in the base URL.
 */
export function generateBatchUrls(
  baseUrl: string,
  startSeason: string,
  startYear: number,
  endSeason: string,
  endYear: number,
): string[] {
  const basePath = baseUrl.replace(/\/[^/]+\.ics$/i, '');
  const urls: string[] = [];

  let currentYear = startYear;
  let seasonIdx = SEASON_ORDER.indexOf(
    startSeason.toLowerCase() as (typeof SEASON_ORDER)[number],
  );
  const endIdx = SEASON_ORDER.indexOf(
    endSeason.toLowerCase() as (typeof SEASON_ORDER)[number],
  );

  if (seasonIdx < 0) seasonIdx = 0;

  while (
    currentYear < endYear ||
    (currentYear === endYear && seasonIdx <= endIdx)
  ) {
    const season = SEASON_ORDER[seasonIdx] ?? 'winter';
    const yearStr =
      season === 'winter'
        ? `${String(currentYear)}-${String(currentYear + 1)}`
        : String(currentYear);
    urls.push(`${basePath}/${season}-${yearStr}.ics`);

    seasonIdx++;
    if (seasonIdx >= SEASON_ORDER.length) {
      seasonIdx = 0;
      currentYear++;
    }
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface ImportExportState {
  /** Whether an ICS import is in progress. */
  isImporting: boolean;
  /** Progress message for import operations. */
  importProgress: string;
  /** Whether a Technion catalog fetch is in progress. */
  isFetchingCatalog: boolean;
  /** Progress message for Technion catalog operations. */
  catalogProgress: string;
}

export interface ImportExportActions {
  /** Import a single ICS URL and add it as a semester. */
  importSingleICS: (url: string) => Promise<{ semesterName: string; count: number }>;
  /** Batch import ICS URLs from a semester range. */
  importBatchICS: (
    baseUrl: string,
    startSeason: string,
    startYear: number,
    endSeason: string,
    endYear: number,
  ) => Promise<ImportResult[]>;
  /** Fetch Technion catalog and enrich courses in the current semester. */
  fetchTechnionCatalog: () => Promise<{ updatedCount: number; catalogSize: number }>;
}

export function useImportExport(): ImportExportState & ImportExportActions {
  const importSemester = useAppStore((s) => s.importSemester);
  const semesters = useAppStore((s) => s.semesters);
  const currentSemesterId = useAppStore((s) => s.currentSemesterId);
  const updateCourse = useAppStore((s) => s.updateCourse);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [isFetchingCatalog, setIsFetchingCatalog] = useState(false);
  const [catalogProgress, setCatalogProgress] = useState('');

  // Mounted guard to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -- Single ICS import ----------------------------------------------------

  const importSingleICS = useCallback(
    async (url: string) => {
      setIsImporting(true);
      setImportProgress('Fetching schedule data...');

      try {
        const imported = await fetchICSData(url);
        if (!mountedRef.current) return { semesterName: '', count: 0 };

        setImportProgress('Processing courses...');

        const semester = importedSemesterToSemester(imported);
        importSemester(semester);

        const result = {
          semesterName: semester.name,
          count: semester.courses.length,
        };
        if (mountedRef.current) setImportProgress('');
        return result;
      } finally {
        if (mountedRef.current) setIsImporting(false);
      }
    },
    [importSemester],
  );

  // -- Batch ICS import -----------------------------------------------------

  const importBatchICS = useCallback(
    async (
      baseUrl: string,
      startSeason: string,
      startYear: number,
      endSeason: string,
      endYear: number,
    ) => {
      setIsImporting(true);

      const urls = generateBatchUrls(
        baseUrl,
        startSeason,
        startYear,
        endSeason,
        endYear,
      );

      if (urls.length === 0) {
        setIsImporting(false);
        throw new Error('No semesters in the specified range.');
      }

      setImportProgress(`Importing 0/${String(urls.length)} semesters...`);

      const results: ImportResult[] = [];

      for (let i = 0; i < urls.length; i++) {
        if (!mountedRef.current) break;

        const url = urls[i]!;
        setImportProgress(
          `Importing ${String(i + 1)}/${String(urls.length)} semesters...`,
        );

        try {
          const imported = await fetchICSData(url);
          if (!mountedRef.current) break;

          const semester = importedSemesterToSemester(imported);
          importSemester(semester);

          results.push({
            url,
            success: true,
            semesterName: semester.name,
            count: semester.courses.length,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unknown import error';
          results.push({ url, success: false, error: message });
        }
      }

      if (mountedRef.current) {
        setImportProgress('');
        setIsImporting(false);
      }
      return results;
    },
    [importSemester],
  );

  // -- Technion catalog fetch -----------------------------------------------

  const fetchTechnionCatalog = useCallback(async () => {
    setIsFetchingCatalog(true);
    setCatalogProgress('Fetching semester list...');

    try {
      const semesterList = await fetchSemesterList();
      if (!mountedRef.current) return { updatedCount: 0, catalogSize: 0 };

      setCatalogProgress('Building course catalog...');

      const { catalog, size } = await buildCourseCatalog(
        semesterList,
        (msg) => { if (mountedRef.current) setCatalogProgress(msg); },
      );

      if (!mountedRef.current) return { updatedCount: 0, catalogSize: size };

      const currentSemester = semesters.find(
        (s) => s.id === currentSemesterId,
      );

      if (!currentSemester || currentSemester.courses.length === 0) {
        if (mountedRef.current) setCatalogProgress('');
        return { updatedCount: 0, catalogSize: size };
      }

      if (mountedRef.current) setCatalogProgress('Enriching courses...');
      const { courses: enriched, updatedCount } = enrichCoursesWithCatalog(
        currentSemester.courses,
        catalog,
      );

      // Apply enriched data back to store
      for (const course of enriched) {
        const original = currentSemester.courses.find(
          (c) => c.id === course.id,
        );
        if (original && original !== course) {
          updateCourse(currentSemesterId!, course.id, {
            points: course.points,
            lecturer: course.lecturer,
            faculty: course.faculty,
            syllabus: course.syllabus,
            number: course.number,
          });
        }
      }

      if (mountedRef.current) setCatalogProgress('');
      return { updatedCount, catalogSize: size };
    } finally {
      if (mountedRef.current) setIsFetchingCatalog(false);
    }
  }, [semesters, currentSemesterId, updateCourse]);

  return {
    isImporting,
    importProgress,
    isFetchingCatalog,
    catalogProgress,
    importSingleICS,
    importBatchICS,
    fetchTechnionCatalog,
  };
}
