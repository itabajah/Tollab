/**
 * Schedule Conflict Detection
 * 
 * Detects overlapping time slots between courses in a semester
 */

import type { Course, ScheduleItem } from '@/types';

export interface TimeSlot {
  courseId: string;
  courseName: string;
  courseColor: string;
  itemId: string;
  day: number; // 0-6 (Sunday-Saturday)
  startMinutes: number; // Minutes from midnight
  endMinutes: number;
  type?: string;
  location?: string;
}

export interface ScheduleConflict {
  slot1: TimeSlot;
  slot2: TimeSlot;
  overlapStart: number;
  overlapEnd: number;
  overlapMinutes: number;
}

/**
 * Convert time string (HH:MM) to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 * Returns the overlap in minutes if they do, 0 otherwise
 */
function getOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): { overlap: number; start: number; end: number } {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  const overlap = Math.max(0, overlapEnd - overlapStart);
  return { overlap, start: overlapStart, end: overlapEnd };
}

/**
 * Extract all time slots from a list of courses
 */
export function extractTimeSlots(courses: Course[]): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const course of courses) {
    for (const item of course.schedule) {
      if (item.start && item.end) {
        slots.push({
          courseId: course.id,
          courseName: course.name,
          courseColor: course.color,
          itemId: item.id,
          day: item.day,
          startMinutes: timeToMinutes(item.start),
          endMinutes: timeToMinutes(item.end),
          type: item.type,
          location: item.location,
        });
      }
    }
  }

  return slots;
}

/**
 * Find all schedule conflicts in a list of courses
 */
export function findConflicts(courses: Course[]): ScheduleConflict[] {
  const slots = extractTimeSlots(courses);
  const conflicts: ScheduleConflict[] = [];

  // Compare each pair of slots
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slot1 = slots[i];
      const slot2 = slots[j];

      // Skip if different days
      if (slot1.day !== slot2.day) continue;

      // Skip if same course (internal conflicts are OK, e.g., different groups)
      if (slot1.courseId === slot2.courseId) continue;

      // Check for overlap
      const { overlap, start, end } = getOverlap(
        slot1.startMinutes,
        slot1.endMinutes,
        slot2.startMinutes,
        slot2.endMinutes
      );

      if (overlap > 0) {
        conflicts.push({
          slot1,
          slot2,
          overlapStart: start,
          overlapEnd: end,
          overlapMinutes: overlap,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get all courses that have conflicts
 */
export function getCoursesWithConflicts(courses: Course[]): Set<string> {
  const conflicts = findConflicts(courses);
  const courseIds = new Set<string>();

  for (const conflict of conflicts) {
    courseIds.add(conflict.slot1.courseId);
    courseIds.add(conflict.slot2.courseId);
  }

  return courseIds;
}

/**
 * Get conflicts for a specific course
 */
export function getConflictsForCourse(
  courseId: string,
  courses: Course[]
): ScheduleConflict[] {
  const allConflicts = findConflicts(courses);
  return allConflicts.filter(
    (c) => c.slot1.courseId === courseId || c.slot2.courseId === courseId
  );
}

/**
 * Check if a schedule item would conflict with existing courses
 * Useful when adding/editing a course
 */
export function wouldConflict(
  newItem: Omit<ScheduleItem, 'id'>,
  courseId: string,
  courses: Course[]
): ScheduleConflict | null {
  const newSlot: TimeSlot = {
    courseId,
    courseName: 'New',
    courseColor: '',
    itemId: 'new',
    day: newItem.day,
    startMinutes: timeToMinutes(newItem.start),
    endMinutes: timeToMinutes(newItem.end),
    type: newItem.type,
    location: newItem.location,
  };

  for (const course of courses) {
    if (course.id === courseId) continue;

    for (const item of course.schedule) {
      if (item.day !== newItem.day) continue;

      const existingStart = timeToMinutes(item.start);
      const existingEnd = timeToMinutes(item.end);

      const { overlap, start, end } = getOverlap(
        newSlot.startMinutes,
        newSlot.endMinutes,
        existingStart,
        existingEnd
      );

      if (overlap > 0) {
        return {
          slot1: newSlot,
          slot2: {
            courseId: course.id,
            courseName: course.name,
            courseColor: course.color,
            itemId: item.id,
            day: item.day,
            startMinutes: existingStart,
            endMinutes: existingEnd,
            type: item.type,
            location: item.location,
          },
          overlapStart: start,
          overlapEnd: end,
          overlapMinutes: overlap,
        };
      }
    }
  }

  return null;
}

/**
 * Format conflict for display
 */
export function formatConflict(
  conflict: ScheduleConflict,
  locale: 'en' | 'he' | 'ar' = 'en'
): string {
  const days: Record<string, string[]> = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  };

  const dayName = days[locale][conflict.slot1.day];
  const startTime = minutesToTime(conflict.overlapStart);
  const endTime = minutesToTime(conflict.overlapEnd);

  const templates: Record<string, string> = {
    en: `${conflict.slot1.courseName} conflicts with ${conflict.slot2.courseName} on ${dayName} ${startTime}-${endTime}`,
    he: `${conflict.slot1.courseName} מתנגש עם ${conflict.slot2.courseName} ביום ${dayName} ${startTime}-${endTime}`,
    ar: `${conflict.slot1.courseName} يتعارض مع ${conflict.slot2.courseName} يوم ${dayName} ${startTime}-${endTime}`,
  };

  return templates[locale];
}
