// ============================================
// Tollab - TypeScript Type Definitions
// ============================================

// Recording types
export interface Recording {
  id: string;
  name: string;
  videoLink: string;
  slideLink: string;
  watched: boolean;
}

export interface RecordingTab {
  id: string; // 'lectures', 'tutorials', or custom UUID
  name: string;
  items: Recording[];
}

// Schedule types
export interface ScheduleItem {
  id: string;
  day: number; // 0-6 (Sunday-Saturday)
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
  type?: 'lecture' | 'tutorial' | 'lab' | 'other';
  location?: string;
}

// Homework types
export interface HomeworkLink {
  label: string;
  url: string;
}

export interface Homework {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD format
  completed: boolean;
  notes: string;
  links: HomeworkLink[];
}

// Course types
export interface CourseExams {
  moedA: string; // YYYY-MM-DD format
  moedB: string; // YYYY-MM-DD format
}

export interface Course {
  id: string;
  name: string;
  color: string; // HSL color string
  number: string; // Course code (e.g., "234111")
  points: string; // Credit points
  lecturer: string;
  faculty: string;
  location: string;
  grade: string;
  syllabus: string;
  notes: string;
  exams: CourseExams;
  schedule: ScheduleItem[];
  homework: Homework[];
  recordings: {
    tabs: RecordingTab[];
  };
}

// Calendar settings
export interface CalendarSettings {
  startHour: number; // Default: 8
  endHour: number; // Default: 20
  visibleDays: number[]; // [0,1,2,3,4,5] = Sun-Fri
}

// Semester types
export interface Semester {
  id: string;
  name: string; // e.g., "Winter 2024-2025"
  code?: string; // Cheesefork semester code (e.g., "202401")
  courses: Course[];
  calendarSettings: CalendarSettings;
}

// Settings types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorTheme = 'colorful' | 'single' | 'mono';

export interface Settings {
  theme: ThemeMode;
  showCompleted: boolean;
  showWatchedRecordings: boolean;
  colorTheme: ColorTheme;
  baseColorHue: number; // 0-360
}

// Profile types
export interface Profile {
  id: string;
  name: string;
  faculty?: string; // Faculty key (e.g., 'cs', 'ee')
  degree?: string; // Degree type (e.g., 'bachelor', 'master', 'phd')
  cpGoal?: number; // Credit points goal
  startYear?: number; // Year started studying
  onboardingComplete?: boolean;
}

// App data structure (stored in localStorage/Firebase)
export interface AppData {
  semesters: Semester[];
  settings: Settings;
  lastModified: string; // ISO date string
}

// UI State types
export interface ModalState {
  isOpen: boolean;
  type: 'settings' | 'course' | 'semester' | 'confirm' | 'prompt' | null;
  data?: unknown;
}

export interface CourseModalTab {
  id: 'recordings' | 'homework' | 'details';
  label: string;
}

// Firebase sync state
export interface SyncState {
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
  error: string | null;
  user: FirebaseUser | null;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Import/Export types
export interface ImportResult {
  success: boolean;
  message: string;
  data?: Partial<AppData>;
}

export interface ExportData {
  version: string;
  exportDate: string;
  profile: string;
  data: AppData;
}

// Video fetch types
export interface VideoInfo {
  title: string;
  url: string;
  thumbnail?: string;
}

export interface PlaylistImportResult {
  success: boolean;
  videos: VideoInfo[];
  error?: string;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
}

// Ticker message types
export interface TickerMessage {
  id: string;
  text: string;
  priority: number;
  type: 'info' | 'warning' | 'success' | 'reminder';
}

// Sort options
export type RecordingSortOption = 'default' | 'manual' | 'name' | 'watched';
export type HomeworkSortOption = 'date' | 'completion' | 'name';

// Constants
export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  startHour: 8,
  endHour: 20,
  visibleDays: [0, 1, 2, 3, 4, 5], // Sunday to Friday
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  showCompleted: true,
  showWatchedRecordings: true,
  colorTheme: 'colorful',
  baseColorHue: 220,
};

export const SEMESTER_TYPES = ['Winter', 'Spring', 'Summer'] as const;
export type SemesterType = (typeof SEMESTER_TYPES)[number];

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const DAYS_OF_WEEK_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

// Storage keys
export const STORAGE_KEYS = {
  PROFILES: 'tollab_profiles',
  ACTIVE_PROFILE: 'tollab_active',
  DATA_PREFIX: 'tollab_',
  SETTINGS: 'tollab_settings',
} as const;

// Helper type for creating new entities
export type NewCourse = Omit<Course, 'id'>;
export type NewSemester = Omit<Semester, 'id'>;
export type NewHomework = Omit<Homework, 'id'>;
export type NewRecording = Omit<Recording, 'id'>;
