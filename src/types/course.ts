/**
 * Course, schedule, and exam types for the Tollab academic management app.
 */

import type { Homework } from './homework';
import type { RecordingTab } from './recording';

/** A single exam entry (Moed A or B). */
export interface ExamEntry {
  /** Exam date in YYYY-MM-DD format, or empty string if unset. */
  moedA: string;
  /** Exam date in YYYY-MM-DD format, or empty string if unset. */
  moedB: string;
}

/** A weekly recurring schedule slot for a course. */
export interface ScheduleSlot {
  /** Day of week (0=Sunday through 6=Saturday). */
  day: number;
  /** Start time in "HH:MM" format. */
  start: string;
  /** End time in "HH:MM" format. */
  end: string;
}

/** Container for recording tabs within a course. */
export interface CourseRecordings {
  /** Array of recording tabs (e.g. Lectures, Tutorials, custom). */
  tabs: RecordingTab[];
}

/** A single academic course with all associated data. */
export interface Course {
  /** Unique identifier. */
  id: string;
  /** Course display name (e.g. "Introduction to Computer Science"). */
  name: string;
  /** Course catalog number (e.g. "234111"). */
  number: string;
  /** Credit points (e.g. "3.0"). */
  points: string;
  /** Lecturer name. */
  lecturer: string;
  /** Faculty or department. */
  faculty: string;
  /** Classroom location. */
  location: string;
  /** Grade (0-100) as string, or empty string if unset. */
  grade: string;
  /** HSL color string for course card (e.g. "hsl(137, 45%, 50%)"). */
  color: string;
  /** Syllabus URL or description. */
  syllabus: string;
  /** Free-form notes. */
  notes: string;
  /** Exam dates (Moed A and B). */
  exams: ExamEntry;
  /** Weekly recurring schedule slots. */
  schedule: ScheduleSlot[];
  /** Homework assignments. */
  homework: Homework[];
  /** Lecture/tutorial recordings organized in tabs. */
  recordings: CourseRecordings;
}
