# Tollab — Comprehensive Documentation

> **Tollab** (طُلّاب — Arabic for "students") is a full-featured, client-side academic management web application purpose-built for [Technion – Israel Institute of Technology](https://www.technion.ac.il/) students. It is hosted at **[tollab.co.il](https://tollab.co.il)** via GitHub Pages.

---

## Table of Contents

- [Tollab — Comprehensive Documentation](#tollab--comprehensive-documentation)
  - [Table of Contents](#table-of-contents)
  - [1. Project Overview](#1-project-overview)
    - [What Tollab Does](#what-tollab-does)
    - [Brand Identity](#brand-identity)
  - [2. Architecture \& Design Philosophy](#2-architecture--design-philosophy)
    - [Client-Only SPA](#client-only-spa)
    - [Component Architecture](#component-architecture)
    - [State Management](#state-management)
    - [Data Persistence Strategy](#data-persistence-strategy)
  - [3. Technology Stack](#3-technology-stack)
    - [External APIs / Services](#external-apis--services)
  - [4. Project Structure](#4-project-structure)
  - [5. Data Model](#5-data-model)
    - [Top-Level Structure](#top-level-structure)
    - [Semester](#semester)
    - [Course](#course)
    - [ScheduleSlot](#scheduleslot)
    - [Homework](#homework)
    - [RecordingTab](#recordingtab)
    - [RecordingItem](#recordingitem)
    - [Profile System](#profile-system)
  - [6. Core Modules — In-Depth](#6-core-modules--in-depth)
    - [6.1 `src/constants/` — Application Configuration](#61-srcconstants--application-configuration)
    - [6.2 `src/utils/validation.ts` — Input Validation \& Sanitization](#62-srcutilsvalidationts--input-validation--sanitization)
    - [6.3 `src/utils/error-handling.ts` — Error Handling \& Retry Logic](#63-srcutilserror-handlingts--error-handling--retry-logic)
    - [6.4 `src/store/app-store.ts` — Application State](#64-srcstoreapp-storets--application-state)
    - [6.5 `src/utils/` — Utility Functions](#65-srcutils--utility-functions)
    - [6.6 `src/components/toast/` — Toast Notification System](#66-srccomponentstoast--toast-notification-system)
    - [6.7 `src/hooks/useTheme.ts` — Theme Management](#67-srchooksusethemets--theme-management)
    - [6.8 `src/services/firebase-sync.ts` — Cloud Sync via Firebase](#68-srcservicesfirebase-syncts--cloud-sync-via-firebase)
    - [6.9 `src/store/profile-store.ts` — Profile Management](#69-srcstoreprofile-storets--profile-management)
    - [6.10 `src/services/` — External API Services](#610-srcservices--external-api-services)
    - [6.11 `src/hooks/useTickerMessages.ts` — Header Ticker \& Fun Reminders](#611-srchooksusetickermessagests--header-ticker--fun-reminders)
    - [6.12 `src/components/` — UI Components](#612-srccomponents--ui-components)
    - [6.13 `src/hooks/` — Custom Preact Hooks](#613-srchooks--custom-preact-hooks)
  - [7. CSS Architecture](#7-css-architecture)
    - [`base.css` — Design Tokens \& Reset](#basecss--design-tokens--reset)
    - [`layout.css` — Application Layout](#layoutcss--application-layout)
    - [`components.css` — UI Components](#componentscss--ui-components)
    - [`calendar.css` — Weekly Schedule](#calendarcss--weekly-schedule)
    - [`modals.css` — Modal System](#modalscss--modal-system)
    - [`toast.css` — Toast Notifications](#toastcss--toast-notifications)
    - [`utils.css` — Utility Classes](#utilscss--utility-classes)
  - [8. Firebase \& Cloud Sync](#8-firebase--cloud-sync)
    - [Setup Requirements](#setup-requirements)
    - [Database Structure](#database-structure)
    - [Sync Flow](#sync-flow)
    - [Security Rules](#security-rules)
  - [9. External Integrations](#9-external-integrations)
    - [Cheesefork (ICS Calendar)](#cheesefork-ics-calendar)
    - [Technion SAP Info Fetcher](#technion-sap-info-fetcher)
    - [YouTube Playlist Import](#youtube-playlist-import)
    - [Panopto Video Import](#panopto-video-import)
  - [10. Testing](#10-testing)
    - [Framework](#framework)
    - [Test Structure](#test-structure)
    - [Test Suites](#test-suites)
    - [Running Tests](#running-tests)
  - [11. Security Considerations](#11-security-considerations)
    - [XSS Prevention](#xss-prevention)
    - [URL Validation](#url-validation)
    - [Input Sanitization](#input-sanitization)
    - [Firebase Security](#firebase-security)
    - [CORS Proxy Usage](#cors-proxy-usage)
  - [12. Deployment](#12-deployment)
    - [GitHub Pages](#github-pages)
    - [Local Development](#local-development)
    - [Scripts (from `package.json`)](#scripts-from-packagejson)
  - [13. Feature Summary](#13-feature-summary)
    - [Academic Management](#academic-management)
    - [Lecture Recording Tracker](#lecture-recording-tracker)
    - [Homework Management](#homework-management)
    - [Weekly Calendar](#weekly-calendar)
    - [Settings \& Customization](#settings--customization)
    - [Data Management](#data-management)
    - [External Integrations](#external-integrations)
    - [Header Ticker](#header-ticker)
  - [14. User Interface Walkthrough](#14-user-interface-walkthrough)
    - [Main Layout](#main-layout)
    - [Course Modal](#course-modal)
    - [Settings Modal](#settings-modal)
    - [Mobile View](#mobile-view)

---

## 1. Project Overview

Tollab is a **single-page application (SPA)** designed to help Technion students manage every aspect of their academic life from one place. There is no backend server — the entire application runs in the browser, with data persisted to `localStorage` and optionally synced to **Firebase Realtime Database** via Google Sign-In.

### What Tollab Does

| Feature | Description |
|---------|-------------|
| **Semester Management** | Create, switch between, and delete semesters (Winter, Spring, Summer terms) |
| **Course Management** | Add courses with full metadata — name, number, faculty, lecturer, location, grade, syllabus, notes, exam dates, weekly schedule, and custom color |
| **Lecture Recordings** | Track video recordings (YouTube, Panopto, or any URL) organized into tabs (Lectures, Tutorials, Custom) with watched/unwatched status and inline video preview |
| **Homework Tracking** | Create homework assignments with due dates, completion status, notes, and attached links; sidebar view with due-date awareness |
| **Weekly Calendar** | Visual weekly schedule grid showing classes with configurable hours and visible days |
| **Profile System** | Multiple named profiles, each with independent data; switch, rename, export, import, or delete profiles |
| **Cloud Sync** | Optional Google Sign-In for real-time cross-device synchronization via Firebase |
| **Cheesefork Integration** | Import schedules from [Cheesefork](https://cheesefork.cf/) ICS calendar files, supporting batch import across semesters |
| **Technion Course Catalog** | Fetch course metadata from the [Technion SAP Info Fetcher](https://github.com/michael-maltsev/technion-sap-info-fetcher) |
| **Video Import** | Bulk-import videos from YouTube playlists or Panopto folders |
| **Theme System** | Light/dark mode with three color schemes (Rainbow, Monochromatic, Grayscale) and per-course color customization |
| **Header Ticker** | Context-aware, rotating fun reminder messages (e.g., homework due, exams approaching, late-night study detection) |
| **Data Portability** | Full JSON export/import of profile data |

### Brand Identity

- **Name**: "Tollab" (طُلّاب) — Arabic for "students"
- **Subtitle**: "For Technionez" (a playful term for Technion students)
- **Domain**: `tollab.co.il`
- **Font**: [Pacifico](https://fonts.google.com/specimen/Pacifico) for the brand name

---

## 2. Architecture & Design Philosophy

### Client-Only SPA

Tollab is a **TypeScript/Preact** single-page application built with **Vite**. It uses:
- **Preact** — Lightweight (3 KB) React-compatible UI framework with JSX
- **TypeScript** — Strict mode with `noUncheckedIndexedAccess` for full type safety
- **Vite 6.x** — Fast HMR dev server and optimized production builds
- **ESM imports** — Standard ES module system, no global scope dependencies

The application runs entirely in the browser with no backend server. Data is persisted to `localStorage` and optionally synced to Firebase Realtime Database via Google Sign-In.

### Component Architecture

The UI is built from composable Preact functional components organized by feature domain:

```
App
├── MainLayout                    ← Two-column responsive shell
│   ├── Header                    ← Brand, theme toggle, settings
│   ├── HeaderTicker              ← Context-aware rotating messages
│   ├── SemesterControls          ← Semester select, add, delete
│   ├── CourseList                ← Course cards with progress indicators
│   │   └── CourseCard            ← Individual course card
│   ├── WeeklySchedule            ← Calendar grid with event chips
│   └── HomeworkSidebar           ← Urgency-grouped homework list
├── Footer                        ← Credits
├── AddSemesterModal              ← Semester creation dialog
├── CourseModal                   ← Recordings/Homework/Details tabs
├── SettingsModal                 ← Profile, Appearance, Calendar, Fetch Data
├── SyncConflictModal             ← Cloud vs local conflict resolution
└── ToastContainer                ← Notification stack
```

Each component subscribes to exactly the state slice it needs via Zustand selectors, ensuring efficient re-renders.

### State Management

Tollab uses **Zustand** with the **immer** middleware for state management, split into three stores:

| Store | File | Purpose |
|-------|------|---------|
| **App Store** | `src/store/app-store.ts` | Semesters, courses, settings, sort orders — all persistent domain data |
| **Profile Store** | `src/store/profile-store.ts` | Profile metadata (list of `{id, name}` entries), active profile ID |
| **UI Store** | `src/store/ui-store.ts` | Ephemeral state: modal stack, editing context, temp form data (never persisted) |

Derived state (current semester, homework counts, sorted items) is computed via selector hooks in `src/store/selectors.ts`.

```typescript
// Reading state in a component
const courses = useAppStore((s) => s.currentSemester?.courses ?? []);

// Mutating state (immer enables direct "mutation" syntax)
useAppStore.getState().addCourse(semesterId, courseData);
```

### Data Persistence Strategy

Data is stored in `localStorage` using **full readable typed interfaces** — no abbreviation or compaction. The persistence layer is wired via `src/services/store-persistence.ts`:

1. On startup, `initStorePersistence()` loads profile list, active profile data, and settings from localStorage into the Zustand stores.
2. A debounced subscriber (500ms) watches the app store and auto-saves changes to localStorage.
3. A separate subscriber saves profile list changes immediately.

All localStorage access goes through a single typed service (`src/services/storage.ts`) — no module touches `localStorage` directly.

---

## 3. Technology Stack

| Category | Technology |
|----------|-----------|
| **Language** | TypeScript 5.x (strict mode) |
| **UI Framework** | Preact 10.x (React-compatible, 3 KB) |
| **State Management** | Zustand 5.x with immer middleware |
| **Build Tool** | Vite 6.x with `@preact/preset-vite` |
| **Styling** | Pure CSS with CSS Custom Properties (design tokens) |
| **Authentication** | Firebase Authentication (Google provider, modular SDK v10+) |
| **Database** | Firebase Realtime Database (modular SDK v10+) |
| **Hosting** | GitHub Pages with custom domain (`tollab.co.il`) |
| **Font** | Google Fonts — Pacifico |
| **Unit Testing** | Vitest 3.x + Testing Library (Preact) + jsdom |
| **E2E Testing** | Playwright 1.x |
| **Linting** | ESLint 9.x (flat config) |
| **Formatting** | Prettier 3.x |
| **Package Manager** | npm |

### External APIs / Services

| Service | Purpose |
|---------|---------|
| **Cheesefork** (`cheesefork.cf`) | ICS calendar files for Technion course schedules |
| **Technion SAP Fetcher** (GitHub raw) | Course catalog data (names, lecturers, credits, exam dates) |
| **YouTube** | Playlist scraping for lecture recording import |
| **Panopto** | Video folder extraction via browser console script |
| **CORS Proxies** | `api.codetabs.com`, `corsproxy.org`, `api.allorigins.win` — used to bypass CORS for fetching external data |

---

## 4. Project Structure

```
Tollab/
├── CNAME                              # GitHub Pages custom domain: tollab.co.il
├── index.html                         # Vite entry point (mounts #app)
├── index.legacy.html                  # Preserved legacy SPA (reference only)
├── package.json                       # Dependencies, scripts, project config
├── tsconfig.json                      # TypeScript config (strict mode)
├── vite.config.ts                     # Vite config with Preact preset + path aliases
├── eslint.config.js                   # ESLint 9.x flat config
│
├── public/                            # Static assets (served as-is by Vite)
│
├── src/                               # Application source code
│   ├── main.tsx                       # Entry point — renders <App />, inits persistence
│   ├── App.tsx                        # Root component — composes layout shell
│   ├── vite-env.d.ts                  # Vite client type declarations
│   │
│   ├── types/                         # TypeScript interfaces & type definitions
│   │   ├── index.ts                   #   Barrel re-export
│   │   ├── semester.ts                #   Semester, CalendarSettings
│   │   ├── course.ts                  #   Course, CourseRecordings, ExamEntry, ScheduleSlot
│   │   ├── recording.ts              #   RecordingTab, RecordingItem
│   │   ├── homework.ts               #   Homework, HomeworkLink
│   │   ├── profile.ts                #   Profile, ProfileData
│   │   ├── settings.ts               #   AppSettings, ColorTheme, ThemeMode, sort orders
│   │   ├── validation.ts             #   ValidationResult<T>, VideoUrlResult, etc.
│   │   ├── sync.ts                   #   CloudPayload, SyncConflictInfo, FirebaseSyncState
│   │   ├── toast.ts                  #   ToastOptions, ToastType
│   │   └── ticker.ts                 #   TickerCategory, TickerContext, TickerTemplateMap
│   │
│   ├── constants/                     # Immutable configuration values
│   │   ├── index.ts                   #   Barrel re-export
│   │   ├── api.ts                     #   CORS_PROXIES, TECHNION_SAP_BASE_URL
│   │   ├── calendar.ts               #   DAY_NAMES, DEFAULT_CALENDAR_SETTINGS
│   │   ├── semesters.ts              #   SEMESTER_SEASONS, SEMESTER_TRANSLATIONS
│   │   ├── sort-orders.ts            #   RECORDING_SORT_ORDERS, HOMEWORK_SORT_ORDERS
│   │   ├── storage-keys.ts           #   STORAGE_KEYS (localStorage key prefixes)
│   │   ├── themes.ts                 #   COLOR_THEMES, DEFAULT_THEME_SETTINGS, GOLDEN_ANGLE
│   │   ├── ticker-templates.ts       #   Ticker message templates by category
│   │   ├── ui.ts                     #   ANIMATION_DURATIONS, MAX_LENGTHS, TOAST_CONFIG, etc.
│   │   └── validation.ts             #   VALIDATION_PATTERNS, VALIDATION_LIMITS
│   │
│   ├── store/                         # Zustand state management
│   │   ├── app-store.ts               #   Main app state (semesters, settings, CRUD actions)
│   │   ├── profile-store.ts           #   Profile metadata (list, active profile)
│   │   ├── ui-store.ts                #   Ephemeral UI state (modals, editing context)
│   │   └── selectors.ts              #   Derived-state selector hooks
│   │
│   ├── services/                      # Side-effect services (localStorage, Firebase, APIs)
│   │   ├── storage.ts                 #   Typed localStorage interface (single entry point)
│   │   ├── store-persistence.ts       #   Auto-save subscribers wiring stores → localStorage
│   │   ├── firebase-config.ts         #   Firebase init from Vite env vars
│   │   ├── firebase-auth.ts           #   Google Sign-In auth service
│   │   ├── firebase-sync.ts           #   Realtime Database sync with echo prevention
│   │   ├── cors-proxy.ts             #   CORS proxy rotation with retry/backoff
│   │   ├── youtube.ts                #   YouTube playlist scraping
│   │   ├── panopto.ts                #   Panopto video extraction
│   │   ├── technion-catalog.ts       #   Technion SAP course catalog fetch
│   │   └── cheesefork.ts             #   Cheesefork ICS import + batch sync
│   │
│   ├── utils/                         # Pure utility functions (no side effects)
│   │   ├── index.ts                   #   Barrel re-export
│   │   ├── color.ts                   #   HSL generation, hue extraction, course colors
│   │   ├── date.ts                    #   Date parsing, week range, day-of-week
│   │   ├── dom.ts                     #   escapeHtml, DOM helpers
│   │   ├── error-handling.ts          #   Retry logic, backoff, error classification
│   │   ├── ics-parser.ts             #   ICS/iCal format parser
│   │   ├── semester.ts               #   Semester comparison and sorting
│   │   ├── string.ts                 #   Truncation, ID generation, sanitization
│   │   ├── validation.ts             #   Input validators (strings, URLs, dates, numbers)
│   │   └── video.ts                  #   Platform detection, embed URL extraction
│   │
│   ├── hooks/                         # Custom Preact hooks
│   │   ├── useCalendarTime.ts         #   Current time line position updates
│   │   ├── useFirebaseSync.ts         #   Firebase auth state + real-time sync
│   │   ├── useImportExport.ts         #   Cheesefork/Technion import orchestration
│   │   ├── useTheme.ts               #   Theme toggle + color scheme management
│   │   └── useTickerMessages.ts      #   Context-aware ticker message rotation
│   │
│   ├── components/                    # Preact UI components (organized by feature)
│   │   ├── layout/                    #   Header, Footer, MainLayout, HeaderTicker, SemesterControls
│   │   ├── courses/                   #   CourseList, CourseCard, CourseProgress
│   │   ├── calendar/                  #   WeeklySchedule, TimeGrid, EventChip, CurrentTimeLine
│   │   ├── homework/                  #   HomeworkSidebar, HomeworkItem, HomeworkEditor
│   │   ├── recordings/                #   RecordingsPanel, RecordingsTabs, RecordingItem, VideoPreview
│   │   ├── modals/                    #   Modal, CourseModal, SettingsModal, AddSemesterModal, dialogs
│   │   ├── settings/                  #   ProfileTab, AppearanceTab, CalendarTab, FetchDataTab
│   │   ├── toast/                     #   ToastContainer, Toast, ToastContext
│   │   └── ui/                        #   Button, IconButton, Select, Checkbox (primitives)
│   │
│   └── css/                           # Modular CSS architecture
│       ├── base.css                   #   CSS variables, theme colors, base elements
│       ├── layout.css                 #   App layout, two-column grid, responsive
│       ├── components.css             #   Course cards, buttons, forms, controls
│       ├── calendar.css               #   Weekly schedule grid, time slots, event chips
│       ├── modals.css                 #   Modal overlays, tabs, recordings UI
│       ├── toast.css                  #   Toast notification styling & animations
│       └── utils.css                  #   Utility classes (hidden, scrollbar, etc.)
│
└── tests/                             # Test suites
    ├── setup.ts                       #   Vitest environment setup (jsdom mocks)
    └── unit/                          #   Unit tests
        ├── utils/                     #     Tests for src/utils/ (color, date, dom, etc.)
        └── validation/                #     Tests for validation functions
```

---

## 5. Data Model

All data types are defined as **TypeScript interfaces** in `src/types/`. The type system enforces data integrity at compile time with strict mode and `noUncheckedIndexedAccess`.

### Top-Level Structure

```typescript
// src/store/app-store.ts — AppState
interface AppState {
  semesters: Semester[];
  currentSemesterId: string | null;
  settings: AppSettings;
  lastModified: string;  // ISO 8601
}
```

### Semester

```typescript
// src/types/semester.ts
interface Semester {
  id: string;
  name: string;               // e.g., "Winter 2024-2025", "Spring 2025"
  courses: Course[];
  calendarSettings: CalendarSettings;
}

interface CalendarSettings {
  startHour: number;           // 0-23, default 8
  endHour: number;             // 0-23, default 20
  visibleDays: number[];       // 0=Sun through 6=Sat, default [0,1,2,3,4,5]
}
```

### Course

```typescript
// src/types/course.ts
interface Course {
  id: string;
  name: string;                // e.g., "Introduction to Computer Science"
  number: string;              // e.g., "234111"
  points: string;              // e.g., "3.0"
  lecturer: string;
  faculty: string;
  location: string;
  grade: string;               // 0-100
  color: string;               // HSL, e.g., "hsl(137, 45%, 50%)"
  syllabus: string;
  notes: string;
  exams: ExamEntry;
  schedule: ScheduleSlot[];
  homework: Homework[];
  recordings: CourseRecordings;
}

interface ExamEntry {
  moedA: string;               // YYYY-MM-DD
  moedB: string;               // YYYY-MM-DD
}

interface CourseRecordings {
  tabs: RecordingTab[];
}
```

### ScheduleSlot

```typescript
// src/types/course.ts
interface ScheduleSlot {
  day: number;                 // 0=Sunday through 6=Saturday
  start: string;               // "HH:MM"
  end: string;                 // "HH:MM"
}
```

### Homework

```typescript
// src/types/homework.ts
interface Homework {
  title: string;
  dueDate: string;             // YYYY-MM-DD
  completed: boolean;
  notes: string;
  links: HomeworkLink[];
}

interface HomeworkLink {
  label: string;
  url: string;
}
```

### RecordingTab

```typescript
// src/types/recording.ts
interface RecordingTab {
  id: string;                  // "lectures", "tutorials", or "custom_<uniqueId>"
  name: string;
  items: RecordingItem[];
}
```

### RecordingItem

```typescript
// src/types/recording.ts
interface RecordingItem {
  name: string;
  videoLink: string;           // URL
  slideLink: string;           // URL
  watched: boolean;
}
```

### Profile System

Profile metadata is managed by the Profile Store (`src/store/profile-store.ts`), separate from application data:

```typescript
// src/types/profile.ts
interface Profile {
  id: string;
  name: string;
}

interface ProfileData {
  semesters: Semester[];
  settings: AppSettings;
  lastModified: string;
}
```

```
localStorage layout:
  tollab_profiles       → Profile[]         (profile registry)
  tollab_active         → string            (active profile ID)
  tollab_data_<id>      → ProfileData       (full typed JSON, one per profile)
  tollab_settings       → AppSettings       (app-wide settings)
```

---

## 6. Core Modules — In-Depth

### 6.1 `src/constants/` — Application Configuration

Immutable configuration values defined as frozen objects and TypeScript enums. Organized into domain-specific files with barrel re-export via `index.ts`.

**Key Exports:**

- **`SORT_ORDERS`** — Sort options for recordings (Default, Manual, Name A-Z/Z-A, Watched/Unwatched first) and homework (Manual, Date, Completed, Name)
- **`DEFAULT_CALENDAR_SETTINGS`** — Start hour 8, end hour 20, visible days Sun-Fri
- **`STORAGE_KEYS`** — localStorage key names/prefixes (`tollab_profiles`, `tollab_active`, `tollab_data_`)
- **`COLOR_THEMES`** — Three themes: `colorful` (rainbow), `single` (monochromatic), `mono` (grayscale)
- **`DEFAULT_THEME_SETTINGS`** — Light mode, colorful theme, base hue 200
- **`GOLDEN_ANGLE`** — 137° for generating visually distinct sequential course colors
- **`DEFAULT_RECORDING_TABS`** — Two default tabs: "Lectures" and "Tutorials"
- **`PROTECTED_TAB_IDS`** — Set of `['lectures', 'tutorials']` — cannot be deleted
- **`CORS_PROXIES`** — Array of proxy URL generator functions for bypassing CORS
- **`TECHNION_SAP_BASE_URL`** — GitHub raw URL for Technion course catalog data
- **`SEMESTER_SEASONS`** — `['Winter', 'Spring', 'Summer']`
- **`SEMESTER_TRANSLATIONS`** — Hebrew-to-English mappings (`אביב` → `Spring`, etc.)
- **`ANIMATION_DURATIONS`** — Timing constants for UI animations
- **`MAX_LENGTHS`** — Truncation limits for display strings
- **`VALIDATION_PATTERNS`** — Regex patterns for URL, date, time, course number validation
- **`VALIDATION_LIMITS`** — Max lengths for all input fields

### 6.2 `src/utils/validation.ts` — Input Validation & Sanitization

A comprehensive, production-grade validation layer that prevents malformed data from entering the system. All validators return a consistent `ValidationResult<T>` type:

```typescript
interface ValidationResult<T = string> {
  valid: boolean;
  value: T;
  error: string | null;
}
```

**Validation Functions:**

| Function | Purpose | Key Rules |
|----------|---------|-----------|
| `validateString()` | General string validation | Required/optional, min/max length, trim, regex pattern |
| `validateCourseName()` | Course name validation | Required, max 100 chars |
| `validateHomeworkTitle()` | Homework title validation | Required, max 200 chars |
| `validateProfileName()` | Profile name + uniqueness | Required, max 50 chars, checks for duplicate names |
| `validateNotes()` | Notes/description text | Optional, max 5000 chars |
| `validateUrl()` | URL format validation | Protocol whitelist (http/https), max 2048 chars, uses `URL` constructor |
| `validateVideoUrl()` | Video URL + platform detection | Returns `VideoUrlResult` with platform: `youtube`, `panopto`, or `other` |
| `validateNumber()` | Number validation | Range, integer, required, zero-check |
| `validateDate()` | Date string validation | YYYY-MM-DD format, reasonable range (2000-2100) |
| `validateTime()` | Time string validation | HH:MM format regex |
| `validateImportedData()` | Full import data structure | Validates semesters array, courses, recordings structure; returns warnings |
| `sanitizeString()` | XSS/control char stripping | Removes control characters, collapses whitespace |
| `sanitizeFilename()` | Safe filename generation | Path traversal prevention, null byte removal, filesystem-safe |

### 6.3 `src/utils/error-handling.ts` — Error Handling & Retry Logic

Provides consistent, user-friendly error handling across the application.

**Key Components:**

- **`ERROR_CONFIG`** — Retry settings: max 3 retries, 1s initial delay, 10s max delay, 2x backoff
- **`ERROR_MESSAGES`** — User-friendly messages for common error codes (network errors, Firebase errors, storage errors)
- **`extractErrorCode(error)`** — Normalizes various error types into standard codes (Firebase codes, DOMExceptions, fetch errors)
- **`getUserFriendlyError(error)`** — Maps error codes to plain-English messages
- **`isRetryableError(error)`** — Determines if an error should be retried (permission/auth errors are not retried)
- **`calculateBackoffDelay(attempt)`** — Exponential backoff with ±20% jitter
- **`withRetry(fn, options)`** — Wraps async functions with automatic retry on failure
- **`safeExecute(fn, fallback)`** — Synchronous try/catch wrapper with typed fallback value

### 6.4 `src/store/app-store.ts` — Application State

The main Zustand store, replacing the legacy global `appData` object. Uses the immer middleware for clean deeply-nested updates.

**State:**
- `semesters` — Array of semester data
- `currentSemesterId` — Currently selected semester
- `settings` — Theme, color scheme, display preferences
- `lastModified` — ISO 8601 timestamp
- `recordingSortOrders` — Per-tab sort preference
- `homeworkSortOrders` — Per-course sort preference

**Actions (all via immer mutations):**
- Semester CRUD: `addSemester`, `deleteSemester`, `renameSemester`
- Course CRUD: `addCourse`, `updateCourse`, `deleteCourse`, `moveCourse`
- Recording CRUD: `addRecording`, `deleteRecording`, `toggleRecordingWatched`, `updateRecording`, `moveRecording`
- Recording tabs: `addRecordingsTab`, `renameRecordingsTab`, `clearRecordingsTab`, `deleteRecordingsTab`
- Homework CRUD: `addHomework`, `deleteHomework`, `toggleHomeworkCompleted`, `updateHomeworkNotes`, `addHomeworkLink`
- Schedule: `addScheduleItem`, `removeScheduleItem`
- Settings: `updateSettings`, `updateCalendarSettings`
- Bulk: `importCourses` (merges by number/name), `loadData` (full state replacement)

### 6.5 `src/utils/` — Utility Functions

Pure helper functions with no side effects, organized into domain-specific modules:

**`color.ts` — Color Utilities:**
- `extractHueFromColor(color)` — Extracts hue from HSL string
- `getNextAvailableHue(usedHues)` — Calculates next hue based on golden angle distribution
- `generateCourseColor(existingColors)` — Generates HSL color for new courses

**`date.ts` — Date Utilities:**
- `convertDateFormat(dateStr)` — Converts `dd-MM-yyyy` to `yyyy-MM-dd`
- `parseICSDate(icsDate)` — Parses ICS format (`20241027T103000`) to `Date`
- `getCurrentWeekRange()` — Returns `{start, end}` of current week
- `isDateInCurrentWeek(dateStr)` — Checks if a date falls in the current week
- `getDayOfWeekFromDate(dateStr)` — Returns day-of-week number

**`dom.ts` — DOM Helpers:**
- `escapeHtml(text)` — XSS prevention by escaping `&`, `<`, `>`, `"`, `'`

**`semester.ts` — Semester Utilities:**
- `compareSemesters(a, b)` — Sorts semesters newest-first (year descending, then season priority)
- `extractYear(name)` — Extracts year number from semester name
- `getSeasonValue(name)` — Assigns numeric priority to seasons, supports Hebrew names

**`string.ts` — String Utilities:**
- `truncate(str, maxLength)` — Truncates with ellipsis
- `generateId()` — Generates unique IDs via `crypto.randomUUID()`

**`video.ts` — Video Embed Utilities:**
- `detectVideoPlatform(url)` — Returns `'youtube'`, `'panopto'`, or `'unknown'`
- `getVideoEmbedInfo(url)` — Extracts embed URLs for inline preview
- `supportsInlinePreview(url)` — Checks if a URL can be embedded

**`ics-parser.ts` — ICS Format Parser:**
- `parseICS(content)` — Parses iCal/ICS content into typed event objects
- Extracts: `SUMMARY`, `DTSTART`, `DTEND`, `LOCATION`, `RRULE`
- Detects recurring events (lectures) vs one-time events (exams)
- Groups events by course number with Hebrew-to-English semester translation

### 6.6 `src/components/toast/` — Toast Notification System

A full-featured, accessible toast notification system using Preact Context for provider-based access.

**Features:**
- Four types: `success`, `error`, `warning`, `info` — each with distinct SVG icon and color
- Auto-dismiss with configurable duration (4s default, 6s for errors)
- Animated progress bar showing remaining time; pauses on hover
- Maximum 5 visible toasts; oldest removed when limit exceeded
- `aria-live` regions for screen reader accessibility
- Slide-in/slide-out animations

**Components:**
- `ToastContext` — Preact Context providing `addToast()` to the component tree
- `ToastContainer` — Renders the toast stack, manages auto-dismiss timers
- `Toast` — Individual toast with icon, message, progress bar, dismiss button

### 6.7 `src/hooks/useTheme.ts` — Theme Management

A custom Preact hook that manages two independent theming systems:

**1. Dark/Light Mode:**
- Reads `settings.theme` from the app store
- Toggles `body.dark-mode` CSS class via `useEffect`
- `toggleTheme()` — dispatches store action and persists

**2. Course Color Themes:**
Three schemes for course card colors:
- **Colorful (Rainbow)** — Each course gets a distinct hue using the 137° golden angle
- **Monochromatic (Single)** — All courses use shades within ±30° of a configurable base hue
- **Grayscale (Mono)** — All courses are `hsl(0, 0%, 50%)` gray

### 6.8 `src/services/firebase-sync.ts` — Cloud Sync via Firebase

Implements real-time cross-device synchronization using Firebase modular SDK (v10+) with Authentication (Google) and Realtime Database.

**Architecture:**
- Each user gets a single database node: `tollab/users/{uid}/data`
- The node contains a **payload** with ALL profiles (not just the active one)
- On sign-in, local data and cloud data are **merged**
- On local changes, the payload is **debounced** and pushed to the cloud
- A realtime listener receives remote changes and applies them locally

**Key Mechanisms:**

1. **Client ID Deduplication** — Each browser tab generates a `clientId` and a `writeId`. Remote updates from the same client/write are ignored to prevent echo loops.

2. **Merge Strategy:**
   - Profile matching is done by `id`
   - When both local and cloud have the same profile, the one with the newer `lastModified` wins
   - New cloud profiles are added locally (with name deduplication)
   - Empty profiles (no semesters) are skipped during merge
   - Name collisions are resolved by appending `(2)`, `(3)`, etc.

3. **Conflict Resolution Modal:**
   - When cloud and local data differ significantly, a modal offers three choices:
     - **Use Cloud Data** — Replaces local with cloud
     - **Use Local Data** — Overwrites cloud with local
     - **Merge Both** — Combines profiles from both sources (recommended)

### 6.9 `src/store/profile-store.ts` — Profile Management

A Zustand store managing multiple independent user profiles, each with their own full `ProfileData`:

**Actions:**
- `createProfile(name)` — Creates with empty data, validates name uniqueness
- `switchProfile(id)` — Switches active profile, triggers app store reload
- `renameProfile(id, newName)` — Validates uniqueness, bumps `lastModified`
- `deleteProfile(id)` — Handles last-profile edge case by creating a new default
- `exportProfile(id)` — Reads current app store data for JSON export
- `importProfile(data)` — Validates structure, creates new profile with unique name

### 6.10 `src/services/` — External API Services

**`youtube.ts` — YouTube Playlist Import:**
1. Extracts playlist ID from URL (strict `[a-zA-Z0-9_-]` charset validation)
2. Fetches playlist page HTML through CORS proxy
3. Parses video titles and IDs via regex extraction
4. Creates typed `RecordingItem[]` with YouTube embed URLs

**`panopto.ts` — Panopto Import:**
1. User runs a browser console script on the Panopto folder page
2. Script copies video data to clipboard as JSON
3. User pastes into Tollab's import dialog
4. Validates UUID folder IDs (`[a-f0-9-]{36}`) and extracts video metadata
5. Shows a checklist of videos for selective import

**`cors-proxy.ts` — CORS Proxy System:**
- Three proxy services configured, tried in order
- Per-proxy retry with exponential backoff + jitter
- Rate limiting (429) detection with extended backoff
- `AbortController` timeout handling

**`cheesefork.ts` — Cheesefork ICS Import:**
- Fetches ICS file through CORS proxy (tries `.json` first, falls back to `.ics`)
- Supports batch import across semester ranges
- Delegates parsing to `src/utils/ics-parser.ts`

**`technion-catalog.ts` — Technion Course Catalog:**
- Fetches from `michael-maltsev/technion-sap-info-fetcher` (GitHub Pages)
- Enriches existing courses with: full name, lecturer, faculty, credits, exam dates
- Matches by course number

### 6.11 `src/hooks/useTickerMessages.ts` — Header Ticker & Fun Reminders

A custom Preact hook that generates **context-aware, playful reminders** based on the student's current academic state.

**Message Categories (with context rules):**

| Category | Trigger Condition | Example |
|----------|------------------|---------|
| `no_semester` | No semester selected | "You have zero semesters selected. That's… bold." |
| `no_courses` | Semester exists but empty | "No courses yet. Add one and let the chaos begin." |
| `no_schedule` | Courses exist but no schedule | "No schedule set. You're free… but also in danger." |
| `no_classes_today` | Schedule exists but nothing today | "No classes today. Suspiciously peaceful." |
| `class_now` | Class currently in session | "Lecture is live עכשיו (09:30-11:00). Be academically present™." |
| `class_soon` | Class starts within 15 minutes | "Class in {minutes} minutes. This is your warning shot." |
| `class_next` | Class later today | "Next lecture at {start}. Do not be late." |
| `class_tomorrow` | First class tomorrow | "Tomorrow at {start}. Set the alarm. Respectfully." |
| `hw_overdue` | Homework past due date | "HAVEN'T YOU STARTED {title} YET?? It's {days} day(s) overdue." |
| `hw_today` | Homework due today | "TODAY: {title}. Do it. Now." |
| `hw_tomorrow` | Homework due tomorrow | "Tomorrow: {title}. Start it before it starts you." |
| `hw_soon` | Homework due within 7 days | "Heads up: {title} is due in {days} day(s)." |
| `hw_many` | 6+ incomplete homeworks | "You have {count} unfinished homeworks. That's a whole season of content." |
| `hw_all_done` | All homework completed | "All homework is done. Who are you and how can we learn your ways?" |
| `exam_today` | Exam day | "Exam today. Do NOT open this app. Go study." |
| `exam_tomorrow` | Day before exam | "Exam tomorrow. This is not a drill." |
| `exam_soon` | Exam within 3 days | "Exam in {days} day(s). Revision sprint time." |
| `recordings_big` | 10+ unwatched recordings | "You have {count} unwatched recordings in {course}. That's a TV series." |
| `late_night` | 11pm-4am | "It's late. If you're still studying, respect. If not… sleep.exe?" |
| `morning` | 5am-10am | "Good morning. Small win: pick ONE task and finish it." |
| `weekend` | Fri evening, Sat, Sun morning | "Weekend vibes. Also: future-you would love 30 minutes of progress." |
| `all_clear` | Nothing urgent | "You're surprisingly on top of things. Who are you?" |
| `general` | Filler fallback | Always available |

**Implementation:**
- Messages are templates with `{placeholder}` syntax (e.g., `{title}`, `{minutes}`, `{courseMaybe}`)
- Templates defined in `src/constants/ticker-templates.ts`
- A **crossfade animation** alternates between two `<span>` elements for smooth transitions
- Rotation interval configurable; messages prioritized by urgency

### 6.12 `src/components/` — UI Components

The UI layer is built from Preact functional components organized by feature domain. Each component subscribes to Zustand store slices for reactive updates — no manual `renderAll()` calls.

**Layout Components (`layout/`):**
- `Header` — Brand name, theme toggle button, settings gear icon
- `HeaderTicker` — Rotating context-aware messages with crossfade animation
- `MainLayout` — Two-column responsive shell with slot-based composition
- `SemesterControls` — Semester dropdown, add/delete buttons
- `Footer` — Credits

**Course Components (`courses/`):**
- `CourseList` — Renders sorted course cards for the current semester
- `CourseCard` — Color-coded card with title, metadata, progress indicators, reorder buttons
- `CourseProgress` — Recordings watched / homework completed progress bars

**Calendar Components (`calendar/`):**
- `WeeklySchedule` — CSS Grid weekly view with configurable hours and days
- `TimeGrid` — Hour labels and grid lines
- `EventChip` — Course event positioned by time slot, color-coded
- `CurrentTimeLine` — Red dashed line showing current time (updated via `useCalendarTime` hook)

**Homework Components (`homework/`):**
- `HomeworkSidebar` — Urgency-grouped list (overdue → today → this week → upcoming)
- `HomeworkItem` — Title, due date, completion toggle, course name
- `HomeworkEditor` — Inline editing with notes and links management

**Recording Components (`recordings/`):**
- `RecordingsPanel` — Full recordings interface within course modal
- `RecordingsTabs` — Tab bar with count badges and sort controls
- `RecordingItem` — Watched checkbox, video/slides links, edit section, reorder
- `RecordingEditor` — Inline name/URL editing
- `VideoPreview` — Inline iframe embed for YouTube/Panopto

**Modal Components (`modals/`):**
- `Modal` — Base overlay with scroll lock and backdrop
- `CourseModal` — Three-tab interface (Recordings, Homework, Details)
- `SettingsModal` — Four-tab settings (Profile, Appearance, Calendar, Fetch Data)
- `AddSemesterModal` — Semester creation with season/year pickers
- `FetchVideosModal` — YouTube/Panopto import UI
- `SyncConflictModal` — Cloud vs local conflict resolution (Use Cloud / Use Local / Merge)
- `AlertDialog`, `ConfirmDialog`, `PromptDialog` — Promise-based dialog primitives with focus trap
- `useFocusTrap` — Hook for WCAG-compliant keyboard navigation within modals

**Settings Components (`settings/`):**
- `ProfileTab` — Profile selector, rename, cloud sync, export/import, delete
- `AppearanceTab` — Color theme selector, base hue slider, reset colors
- `CalendarTab` — Start/end hours, visible days checkboxes
- `FetchDataTab` — ICS URL input with batch option, Technion catalog fetch

**Toast Components (`toast/`):**
- `ToastContainer` — Renders toast stack at bottom-right
- `Toast` — Individual notification with icon, message, progress bar
- `ToastContext` — Provider pattern for `addToast()` access throughout component tree

**UI Primitives (`ui/`):**
- `Button` — Variants: primary, secondary, danger
- `IconButton` — Icon-only button with aria-label
- `Select` — Styled dropdown select
- `Checkbox` — Styled checkbox with label

### 6.13 `src/hooks/` — Custom Preact Hooks

- **`useCalendarTime`** — Updates the current time line position in the weekly calendar at regular intervals
- **`useFirebaseSync`** — Manages Firebase auth state listener and real-time database sync
- **`useImportExport`** — Orchestrates Cheesefork ICS import, Technion catalog fetch, and batch semester sync
- **`useTheme`** — Theme toggle and color scheme management (see §6.7)
- **`useTickerMessages`** — Context-aware ticker message generation and rotation (see §6.11)

---

## 7. CSS Architecture

The CSS is split into 7 modular files in `src/css/` — no preprocessor, no CSS-in-JS, no utility framework. CSS files are imported in `src/main.tsx` via Vite.

### `base.css` — Design Tokens & Reset
- **CSS Custom Properties** define the entire color system
- Two themes: `:root` (light) and `body.dark-mode` (dark)
- 20+ design tokens: `--bg-primary`, `--text-primary`, `--border-primary`, `--accent`, `--success-*`, `--error-*`, `--progress-*`
- Universal box-sizing reset
- System font stack (Apple, Windows, Linux)
- `transition: background 0.3s, color 0.3s` on body for smooth theme transitions

### `layout.css` — Application Layout
- Two-column layout with CSS `display: flex`
- Left column: course list (scrollable)
- Right column: calendar + homework sidebar (scrollable)
- Responsive breakpoints (768px) collapse to single column
- Mobile-specific: FAB button, scroll-to-homework button, collapsible calendar

### `components.css` — UI Components
- Course cards with colored left border
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.icon-btn`
- Form elements: inputs, selects, textareas with consistent styling
- Semester controls with dropdown and action buttons
- Recording items with hover states and checkbox animations
- Homework items with due-date coloring (overdue = red, soon = yellow)

### `calendar.css` — Weekly Schedule
- CSS Grid for the schedule matrix
- Time labels column with hour markers
- Day header row
- Event chips: absolutely positioned, color-coded per course
- Current time line (red dashed line positioned via JavaScript)
- Responsive: horizontal scroll on mobile, single-day toggle

### `modals.css` — Modal System
- `.modal-overlay` with backdrop blur and centered content
- `.modal` with max-height, scrollable body
- Tab navigation for course modal (Recordings/Homework/Details)
- Settings modal with its own tab system
- Panopto import guide styling
- Recordings control panel with collapsible actions
- Homework edit section with link management

### `toast.css` — Toast Notifications
- Fixed positioning at bottom-right
- Slide-up entry animation, slide-down exit
- Progress bar animation (shrinking bar)
- Color coding: green (success), red (error), yellow (warning), blue (info)

### `utils.css` — Utility Classes
- `.hidden` — `display: none`
- Custom scrollbar styling
- Focus-visible outlines
- Selection color
- Print styles

---

## 8. Firebase & Cloud Sync

### Setup Requirements

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** with Google provider
3. Create **Realtime Database** (start in locked/test mode)
4. Set Vite environment variables in `.env` (see §12 Development Setup):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

### Database Structure

```
tollab/
  users/
    {uid}/
      data/
        v: 2
        u: "2025-04-04T12:00:00.000Z"    # last updated
        w: "writeId_123"                   # write deduplication
        c: "clientId_abc"                  # client deduplication  
        payload:
          v: 2
          u: "2025-04-04T12:00:00.000Z"
          a: "active_profile_id"
          p: [                             # profiles array
            {
              i: "profile_id",
              n: "Profile Name",
              t: "2025-04-04T12:00:00.000Z",  # lastModified
              d: { ... ProfileData ... }
            }
          ]
```

### Sync Flow

```
Local Change → Zustand store mutation → debounced subscriber
                                            ↓
                                     saveToLocalStorage()
                                            ↓
                                     autoSyncToFirebase() (via useFirebaseSync hook)
                                            ↓
                                     saveCloudPayload(uid, payload)
                                            ↓
                                     Realtime listener on other device
                                            ↓
                                     Merge + update Zustand stores
                                            ↓
                                     Preact re-renders reactively
```

### Security Rules

The database should use rules that restrict each user to their own data:
```json
{
  "rules": {
    "tollab": {
      "users": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

---

## 9. External Integrations

### Cheesefork (ICS Calendar)

[Cheesefork](https://cheesefork.cf/) is a popular Technion course scheduler. Tollab imports schedules via:

1. User exports an ICS link from Cheesefork
2. Tollab fetches the ICS file through a CORS proxy
3. Attempts JSON version first (`.json` extension) for richer data
4. Falls back to parsing raw ICS format
5. Extracts: course names/numbers, weekly schedule, exam dates
6. Supports batch import across semester ranges

### Technion SAP Info Fetcher

The [Technion SAP Info Fetcher](https://github.com/michael-maltsev/technion-sap-info-fetcher) publishes course catalog data as JSON on GitHub Pages. Tollab fetches this to enrich existing courses with:
- Full course name
- Lecturer name
- Faculty
- Credit points
- Exam dates (Moed A and Moed B)

### YouTube Playlist Import

1. Accepts YouTube playlist URL
2. Fetches playlist page HTML through CORS proxy
3. Parses video titles and IDs from HTML markup
4. Creates recording items with auto-generated or original titles
5. Supports inline YouTube embed preview

### Panopto Video Import

Panopto (used by many universities for lecture recording) doesn't have a public API. Tollab provides a **browser console script** that:
1. User opens their Panopto folder in a new tab and scrolls to load all videos
2. Opens browser DevTools console
3. Pastes a provided JavaScript one-liner that extracts video titles and IDs
4. The script copies JSON data to clipboard
5. User pastes JSON into Tollab's import dialog
6. Tollab shows a checklist of videos for selective import

---

## 10. Testing

### Framework

- **Vitest 3.x** with `jsdom` environment for DOM simulation
- **Testing Library (Preact)** for component testing
- **Playwright 1.x** for end-to-end testing
- Test files in `tests/` directory matching `*.test.ts` pattern
- Setup file (`tests/setup.ts`) configures:
  - jsdom environment for DOM APIs
  - Testing Library matchers (`@testing-library/jest-dom`)
  - `localStorage` mocking
  - Console method suppression for clean output

### Test Structure

```
tests/
├── setup.ts                     # Vitest environment setup
└── unit/
    ├── utils/                   # Tests for src/utils/ modules
    │   ├── color.test.ts
    │   ├── date.test.ts
    │   ├── dom.test.ts
    │   ├── error-handling.test.ts
    │   ├── ics-parser.test.ts
    │   ├── semester.test.ts
    │   ├── string.test.ts
    │   └── video.test.ts
    └── validation/
        └── validation.test.ts   # Tests for all validation functions
```

### Test Suites

**`utils/` tests** — Comprehensive coverage for all pure utility functions:
- `color.test.ts` — HSL generation, hue extraction, golden angle distribution
- `date.test.ts` — Date parsing, week range, ICS date conversion
- `dom.test.ts` — `escapeHtml` HTML entity escaping for all special characters, null handling
- `error-handling.test.ts` — Retry logic, backoff calculation, error classification
- `ics-parser.test.ts` — ICS format parsing, recurring events, exam extraction
- `semester.test.ts` — Semester comparison, year extraction, season sorting
- `string.test.ts` — Truncation, sanitization, ID generation, filename safety
- `video.test.ts` — Platform detection, embed URL extraction, preview support

**`validation/` tests** — All validation functions with boundary testing:
- `validateString` — Required, trim, length limits, patterns, null/number coercion
- `validateCourseName`, `validateHomeworkTitle`, `validateProfileName`
- `validateUrl`, `validateVideoUrl` — YouTube, Panopto detection
- `validateNumber`, `validateDate`, `validateTime` — Range and format validation
- `sanitizeString` — XSS, HTML entities, control characters
- `sanitizeFilename` — Path traversal (Unix/Windows), null bytes, filesystem-safe

### Running Tests

```bash
npm test                # Run all tests (Vitest)
npm run test:watch      # Watch mode for development
npm run test:coverage   # Run tests with coverage report
```

---

## 11. Security Considerations

### XSS Prevention
- All user-generated content is escaped via `escapeHtml()` in `src/utils/dom.ts` before rendering
- Preact's JSX auto-escapes all interpolated values — no `dangerouslySetInnerHTML` usage
- Video embed URLs are sanitized and only YouTube/Panopto embed URLs are allowed in iframes

### URL Validation
- All URLs are validated using the `URL` constructor in `src/utils/validation.ts`
- Only `http:` and `https:` protocols are allowed
- Maximum URL length: 2048 characters
- Video URLs are validated for platform detection before embedding

### Input Sanitization
- `sanitizeString()` strips control characters and collapses whitespace
- `sanitizeFilename()` prevents path traversal, null bytes, and filesystem-unsafe characters
- All text inputs are trimmed and length-limited via typed validators
- Course numbers validated against alphanumeric pattern
- Time and date formats validated against strict regex patterns
- Imported data undergoes structural validation before processing

### Firebase Security
- Database rules restrict reads/writes to authenticated users' own data
- Google OAuth provides strong authentication
- Firebase config loaded from Vite environment variables (not committed to repo)
- User isolation: each user reads/writes only `tollab/users/{uid}/data`

### CORS Proxy Usage
- External data is fetched through CORS proxies (necessary for a static frontend)
- Response data is parsed and validated before use
- Timeout and rate limiting protections are in place

---

## 12. Deployment

### GitHub Pages

The application is deployed as a static site on GitHub Pages:
- **Custom domain**: `tollab.co.il` (configured via `CNAME` file)
- **Build step**: `npm run build` produces optimized output in `dist/`
- **Firebase config**: Injected via Vite environment variables from CI secrets

### Local Development

```bash
# Clone the repository
git clone https://github.com/itabajah/Tollab.git
cd Tollab

# Install dependencies
npm install

# Create environment file for Firebase config
cp .env.example .env    # (or create .env manually)
# Edit .env with your Firebase project credentials:
#   VITE_FIREBASE_API_KEY=your-api-key
#   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
#   VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
#   VITE_FIREBASE_PROJECT_ID=your-project-id
#   VITE_FIREBASE_APP_ID=your-app-id

# Start Vite dev server with HMR
npm run dev

# Run tests
npm test

# Type-check
npm run typecheck

# Lint
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

### Scripts (from `package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start Vite dev server with HMR |
| `build` | `tsc --noEmit && vite build` | Type-check + production build |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint src/` | Lint all TypeScript/TSX files |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |
| `test` | `vitest run` | Run all tests |
| `test:watch` | `vitest` | Watch mode for development |
| `test:coverage` | `vitest run --coverage` | Tests with coverage report |

---

## 13. Feature Summary

### Academic Management
- Multi-semester support with chronological sorting
- Full course metadata (name, number, points, faculty, lecturer, location, grade, syllabus, notes)
- Course reordering with up/down arrows
- Course-level color coding with three theme strategies

### Lecture Recording Tracker
- Tabbed organization (Lectures, Tutorials, Custom tabs)
- Import from YouTube playlists or Panopto folders
- Manual entry via URL paste
- Watched/unwatched toggle with progress tracking
- Inline video preview (YouTube and Panopto embeds)
- External link to open in new tab
- Slides link attachment
- Name/URL editing per recording
- Six sort options: Default, Manual, Name A-Z, Name Z-A, Unwatched First, Watched First
- "Show Done" toggle to hide watched recordings
- Reorder in manual sort mode

### Homework Management
- Create with title and due date
- Completion toggle
- Notes field
- Multiple links (label + URL) per homework
- Sidebar view sorted by urgency (overdue → today → this week → upcoming → no date)
- "Show Done" toggle for completed homework
- Sort options: Manual, Date, Completion, Name
- Inline editing in modal

### Weekly Calendar
- Visual grid layout
- Configurable: start/end hours, visible days
- Per-semester calendar settings
- Current time indicator (red line)
- Event chips showing course name, time, location
- Mobile: single-day toggle, collapsible view

### Settings & Customization
- Dark/light mode toggle (persisted)
- Three course color themes: Rainbow, Monochromatic, Grayscale
- Monochromatic base hue customizer with live preview
- Per-course color hue slider
- Calendar hours and days configuration
- "Reset All Colors" button

### Data Management
- Multiple profiles with independent data
- Profile create, rename, delete
- JSON export/import
- Cloud sync via Firebase (Google Sign-In)
- Sync conflict resolution (Use Cloud, Use Local, Merge)
- Offline detection with auto-sync on reconnect
- Full typed localStorage persistence via centralized storage service

### External Integrations
- Cheesefork ICS schedule import (single or batch)
- Technion SAP course catalog enrichment
- YouTube playlist video import
- Panopto folder video extraction

### Header Ticker
- 20+ context categories with 100+ message templates
- Real-time awareness: class now, class soon, exam approaching, late night, morning, weekend
- Placeholder system for dynamic values
- Crossfade animation between messages
- Hebrew and English mix in messages

---

## 14. User Interface Walkthrough

### Main Layout

The app uses a **two-column layout** on desktop:

```
┌──────────────────────────────────────────────────┐
│  Tollab   "For Technionez"    [☀/🌙] [⚙]        │  ← Header with brand, theme toggle, settings
├──────────────────────────────────────────────────┤
│  [ NEXT ] It's almost lecture time...             │  ← Header Ticker (context-aware message)
├────────────────────┬─────────────────────────────┤
│  ┌ Semester ▾ ┐    │  Weekly Schedule             │
│  │ [+] [🗑]   │    │  ┌─────┬─────┬─────┬───┐    │
│  └────────────┘    │  │ Sun │ Mon │ Tue │...│    │
│                    │  ├─────┼─────┼─────┤   │    │
│  Course List       │  │ 8:00│     │     │   │    │
│  ┌──────────────┐  │  │ 9:00│[CS] │     │   │    │
│  │ ▌ Intro CS   │  │  │10:00│     │[ALG]│   │    │
│  │ #234111 3pts │  │  │ ... │     │     │   │    │
│  │ 4/12 📹 2/5 📝│ │  └─────┴─────┴─────┘   │    │
│  └──────────────┘  │                         │    │
│  ┌──────────────┐  │  ─── Homework ───       │    │
│  │ ▌ Algorithms  │  │  ○ HW1 - CS (Due: 4/7) │    │
│  │ #236508 4pts │  │  ● HW2 - ALG (Done)    │    │
│  └──────────────┘  │  ○ HW3 - CS (Overdue!)  │    │
│                    │                         │    │
│  [+ Add Course]    │                         │    │
└────────────────────┴─────────────────────────────┘
│  Made by Ibrahim Tabajah                         │  ← Footer with credits
```

### Course Modal

Clicking a course card opens a unified modal with three tabs:

**Recordings Tab:**
- Tab bar: `Lectures (12)` | `Tutorials (8)` | `Custom (5)` | `[+]`
- Sort dropdown
- Recording items with checkboxes, video links, edit buttons
- Add recording input + button

**Homework Tab:**
- List of homework items with completion checkboxes
- Add homework row (title + date + button)

**Details Tab:**
- All course metadata fields
- Weekly schedule builder (day + start time + end time + add)
- Course color hue slider
- Delete/Save buttons

### Settings Modal

Four-tab settings interface:

- **Profile**: Active profile selector, rename, cloud sync (Google Sign-In), export/import, delete
- **Appearance**: Color theme selector (Rainbow/Monochromatic/Grayscale), base hue slider, reset colors
- **Calendar**: Start/end hours, visible days checkboxes
- **Fetch Data**: ICS URL input with batch option, Technion catalog fetch button

### Mobile View

On screens ≤768px:
- Single-column layout
- Calendar collapsed by default (toggle button)
- Single-day view option for calendar
- Scroll-to-homework floating button
- Compact header (shorter sync status text)
- Course details stack vertically
- Recording actions panel is collapsible

---

*This documentation reflects the TypeScript/Preact v2 architecture. For the latest updates, refer to the source code directly.*
