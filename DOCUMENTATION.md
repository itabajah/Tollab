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
    - [Module Loading Order](#module-loading-order)
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
    - [Compact Storage Format (v2)](#compact-storage-format-v2)
  - [6. Core Modules — In-Depth](#6-core-modules--in-depth)
    - [6.1 `constants.js` — Application Configuration](#61-constantsjs--application-configuration)
    - [6.2 `validation.js` — Input Validation \& Sanitization](#62-validationjs--input-validation--sanitization)
    - [6.3 `error-handling.js` — Error Handling \& Retry Logic](#63-error-handlingjs--error-handling--retry-logic)
    - [6.4 `state.js` — State Management \& Data Persistence](#64-statejs--state-management--data-persistence)
    - [6.5 `utils.js` — Utility Functions](#65-utilsjs--utility-functions)
    - [6.6 `toast.js` — Toast Notification System](#66-toastjs--toast-notification-system)
    - [6.7 `theme.js` — Theme Management](#67-themejs--theme-management)
    - [6.8 `firebase-sync.js` — Cloud Sync via Firebase](#68-firebase-syncjs--cloud-sync-via-firebase)
    - [6.9 `profile.js` — Profile Management](#69-profilejs--profile-management)
    - [6.10 `video-fetch.js` — External Video Fetching](#610-video-fetchjs--external-video-fetching)
    - [6.11 `header-ticker.js` — Header Ticker \& Fun Reminders](#611-header-tickerjs--header-ticker--fun-reminders)
    - [6.12 `render.js` — UI Rendering Engine](#612-renderjs--ui-rendering-engine)
    - [6.13 `modals.js` — Modal Dialog Management](#613-modalsjs--modal-dialog-management)
    - [6.14 `course-logic.js` — Course CRUD Operations](#614-course-logicjs--course-crud-operations)
    - [6.15 `item-logic.js` — Recordings, Homework \& Schedule Items](#615-item-logicjs--recordings-homework--schedule-items)
    - [6.16 `import-export.js` — ICS Import \& Technion Data Fetch](#616-import-exportjs--ics-import--technion-data-fetch)
    - [6.17 `events.js` — Event Listeners \& Handlers](#617-eventsjs--event-listeners--handlers)
    - [6.18 `main.js` — Application Entry Point](#618-mainjs--application-entry-point)
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
    - [Test Coverage](#test-coverage)
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

Tollab is a **zero-build, zero-framework** web application. It uses:
- **Vanilla HTML/CSS/JavaScript** — no React, Vue, Angular, or any UI framework
- **No bundler** — no Webpack, Vite, Rollup, or esbuild
- **No transpilation** — modern ES6+ JavaScript served directly to the browser
- **Script tag loading** — all JS files are loaded via `<script>` tags in `index.html` in a specific dependency order

This architecture is intentional: it keeps the project simple, fast to load, and deployable as a static site on GitHub Pages with zero build pipeline.

### Module Loading Order

The script loading order in `index.html` is critical because the modules depend on each other through global scope:

```
constants.js          → Configuration values, frozen objects
validation.js         → Input validation utilities
error-handling.js     → Error handling, retry logic
state.js              → Global state, localStorage persistence, compact/hydrate
utils.js              → Pure helper functions (DOM, date, color, string, video)
toast.js              → Toast notification system
theme.js              → Dark/light mode, color theme management
firebase-config.js    → Firebase credentials (generated at deploy time)
Firebase SDK (CDN)    → firebase-app-compat, firebase-auth-compat, firebase-database-compat
firebase-sync.js      → Google Auth + Realtime Database sync
profile.js            → Profile CRUD, export/import
video-fetch.js        → YouTube/Panopto video fetching with CORS proxy
header-ticker.js      → Context-aware ticker messages
render.js             → All UI rendering functions
modals.js             → Modal dialog management
course-logic.js       → Course CRUD, semester options
item-logic.js         → Recordings, homework, schedule item logic
import-export.js      → ICS parsing, Cheesefork/Technion data import
events.js             → All event listener setup and handlers
main.js               → Entry point, global exports
```

### State Management

There is no Redux, Zustand, or other state library. The application uses a single global `appData` object:

```javascript
let appData = {
    semesters: [...],
    settings: { theme, colorTheme, baseColorHue, showCompleted, showWatchedRecordings },
    lastModified: "ISO timestamp"
};
```

All mutations happen directly on `appData`, followed by a call to `saveData()` (which persists to localStorage) and `renderAll()` (which re-renders the entire UI from scratch).

### Data Persistence Strategy

Data is stored in `localStorage` with a **compact serialization** format (v2):
- Single-letter keys replace verbose property names (e.g., `n` for `name`, `i` for `id`)
- Empty/default values are omitted
- Arrays are used instead of objects for schedule items (`[day, start, end]`)
- Boolean flags use `1`/omitted instead of `true`/`false`

This optimization significantly reduces storage size and JSON parsing overhead. On load, the compact format is **hydrated** back into the full developer-friendly object structure.

---

## 3. Technology Stack

| Category | Technology |
|----------|-----------|
| **Language** | Vanilla JavaScript (ES6+) — no TypeScript |
| **Styling** | Pure CSS with CSS Custom Properties (design tokens) |
| **HTML** | Single `index.html` page |
| **Authentication** | Firebase Authentication (Google provider, compat SDK v9.23.0) |
| **Database** | Firebase Realtime Database (compat SDK v9.23.0) |
| **Hosting** | GitHub Pages with custom domain (`tollab.co.il`) |
| **Font** | Google Fonts — Pacifico |
| **Testing** | Jest + jsdom |
| **Linting** | ESLint |
| **HTML Validation** | html-validate |
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
├── CNAME                           # GitHub Pages custom domain: tollab.co.il
├── index.html                      # Single-page application HTML (~700 lines)
├── package.json                    # npm configuration, Jest setup
│
├── css/                            # Modular CSS architecture
│   ├── base.css                    # CSS variables, theme colors, base elements
│   ├── layout.css                  # App layout, two-column grid, responsive
│   ├── components.css              # Course cards, buttons, forms, controls
│   ├── calendar.css                # Weekly schedule grid, time slots, event chips
│   ├── modals.css                  # Modal overlays, tabs, recordings UI
│   ├── toast.css                   # Toast notification styling & animations
│   └── utils.css                   # Utility classes (hidden, scrollbar, etc.)
│
├── js/                             # Application logic (18 modules)
│   ├── constants.js                # Frozen config objects, enums, API endpoints
│   ├── validation.js               # Input validation (strings, URLs, numbers, dates)
│   ├── error-handling.js           # Retry logic, error classification, backoff
│   ├── state.js                    # Global state, compact/hydrate, localStorage
│   ├── utils.js                    # Pure helpers (DOM, date, color, string, video)
│   ├── toast.js                    # Toast notification manager
│   ├── theme.js                    # Dark/light mode, course color themes
│   ├── firebase-config.js          # Firebase credentials (gitignored, generated at deploy)
│   ├── firebase-config.example.js  # Firebase config template for local dev
│   ├── firebase-sync.js            # Firebase Auth + RTDB sync, conflict resolution
│   ├── profile.js                  # Profile CRUD, export/import
│   ├── video-fetch.js              # YouTube/Panopto fetching with CORS proxy & retry
│   ├── header-ticker.js            # Context-aware rotating ticker messages
│   ├── render.js                   # All UI rendering (semesters, courses, calendar, etc.)
│   ├── modals.js                   # Modal open/close, course modal population
│   ├── course-logic.js             # Course CRUD, semester option generation
│   ├── item-logic.js               # Video preview, recording/homework/tab CRUD
│   ├── import-export.js            # ICS parsing, Cheesefork import, Technion fetch
│   ├── events.js                   # Event listener setup, handlers
│   └── main.js                     # DOMContentLoaded init, global function exports
│
└── tests/                          # Jest test suite
    ├── setup.js                    # Test environment mocks (localStorage, DOM, globals)
    ├── utils.test.js               # Unit tests for utils.js
    └── validation.test.js          # Unit tests for validation.js
```

---

## 5. Data Model

### Top-Level Structure

```
appData
├── lastModified: string (ISO 8601)
├── settings
│   ├── theme: "light" | "dark"
│   ├── colorTheme: "colorful" | "single" | "mono"
│   ├── baseColorHue: number (0-360)
│   ├── showCompleted: boolean
│   └── showWatchedRecordings: boolean
└── semesters: Semester[]
```

### Semester

```
Semester
├── id: string (unique)
├── name: string (e.g., "Winter 2024-2025", "Spring 2025")
├── courses: Course[]
└── calendarSettings
    ├── startHour: number (0-23, default 8)
    ├── endHour: number (0-23, default 20)
    └── visibleDays: number[] (0=Sun through 6=Sat, default [0,1,2,3,4,5])
```

### Course

```
Course
├── id: string (unique)
├── name: string (e.g., "Introduction to Computer Science")
├── number: string (e.g., "234111")
├── points: string (e.g., "3.0")
├── lecturer: string
├── faculty: string
├── location: string
├── grade: string (0-100)
├── color: string (HSL, e.g., "hsl(137, 45%, 50%)")
├── syllabus: string
├── notes: string
├── exams
│   ├── moedA: string (date, YYYY-MM-DD)
│   └── moedB: string (date, YYYY-MM-DD)
├── schedule: ScheduleSlot[]
├── homework: Homework[]
└── recordings
    └── tabs: RecordingTab[]
```

### ScheduleSlot

```
ScheduleSlot
├── day: number (0=Sunday through 6=Saturday)
├── start: string ("HH:MM")
└── end: string ("HH:MM")
```

### Homework

```
Homework
├── title: string
├── dueDate: string (YYYY-MM-DD)
├── completed: boolean
├── notes: string
└── links: Link[]
    ├── label: string
    └── url: string
```

### RecordingTab

```
RecordingTab
├── id: string ("lectures", "tutorials", or "custom_<uniqueId>")
├── name: string
└── items: RecordingItem[]
```

### RecordingItem

```
RecordingItem
├── name: string
├── videoLink: string (URL)
├── slideLink: string (URL)
└── watched: boolean
```

### Profile System

Separate from `appData`, profiles are stored independently:

```
localStorage:
  tollab_profiles     → [ {id, name}, {id, name}, ... ]
  tollab_active       → "profile_id"
  tollab_<profileId>  → compact(appData)  ← one per profile
```

### Compact Storage Format (v2)

The compact format maps full property names to abbreviated keys:

| Full Path | Compact Key | Notes |
|-----------|------------|-------|
| `lastModified` | `t` | timestamp |
| `settings` | `s` | only non-default values |
| `semesters` | `d` | data array |
| `semester.id` | `i` | |
| `semester.name` | `n` | |
| `semester.courses` | `c` | |
| `course.name` | `n` | |
| `course.number` | `num` | omitted if empty |
| `course.points` | `pts` | omitted if empty |
| `course.lecturer` | `lec` | omitted if empty |
| `course.homework` | `hw` | omitted if empty |
| `course.recordings` | `rec` | only tabs with items |
| `homework.title` | `t` | |
| `homework.dueDate` | `d` | |
| `homework.completed` | `c` | `1` or omitted |
| `recording.name` | `n` | |
| `recording.videoLink` | `v` | |
| `recording.watched` | `w` | `1` or omitted |
| `schedule` | `sch` | `[day, start, end]` array format |

---

## 6. Core Modules — In-Depth

### 6.1 `constants.js` — Application Configuration

The first module loaded. Defines all configuration values as **frozen objects** (`Object.freeze`) to prevent accidental mutation.

**Key Exports:**

- **`SORT_ORDERS`** — Sort options for recordings (Default, Manual, Name A-Z/Z-A, Watched/Unwatched first) and homework (Manual, Date, Completed, Name)
- **`DEFAULT_CALENDAR_SETTINGS`** — Start hour 8, end hour 20, visible days Sun-Fri
- **`STORAGE_KEYS`** — localStorage key names/prefixes (`tollab_profiles`, `tollab_active`, `tollab_`)
- **`COLOR_THEMES`** — Three themes: `colorful` (rainbow), `single` (monochromatic), `mono` (grayscale)
- **`DEFAULT_THEME_SETTINGS`** — Light mode, colorful theme, base hue 200
- **`GOLDEN_ANGLE`** — 137° for generating visually distinct sequential course colors
- **`DEFAULT_RECORDING_TABS`** — Two default tabs: "Lectures" and "Tutorials"
- **`PROTECTED_TAB_IDS`** —  Set of `['lectures', 'tutorials']` — cannot be deleted
- **`CORS_PROXIES`** — Array of proxy URL generator functions for bypassing CORS
- **`TECHNION_SAP_BASE_URL`** — GitHub raw URL for Technion course catalog data
- **`SEMESTER_SEASONS`** — `['Winter', 'Spring', 'Summer']`
- **`SEMESTER_TRANSLATIONS`** — Hebrew-to-English mappings (`אביב` → `Spring`, etc.)
- **`ANIMATION_DURATIONS`** — Timing constants for UI animations
- **`MAX_LENGTHS`** — Truncation limits for display strings

### 6.2 `validation.js` — Input Validation & Sanitization

A comprehensive, production-grade validation layer that prevents malformed data from entering the system.

**Validation Functions:**

| Function | Purpose | Key Rules |
|----------|---------|-----------|
| `validateString()` | General string validation | Required/optional, min/max length, trim, regex pattern |
| `validateCourseName()` | Course name validation | Required, max 100 chars |
| `validateHomeworkTitle()` | Homework title validation | Required, max 200 chars |
| `validateProfileName()` | Profile name + uniqueness | Required, max 50 chars, checks for duplicate names |
| `validateNotes()` | Notes/description text | Optional, max 5000 chars |
| `validateUrl()` | URL format validation | Protocol whitelist (http/https), max 2048 chars, uses `URL` constructor |
| `validateVideoUrl()` | Video URL + platform detection | Returns `{valid, value, platform}` where platform is `youtube`, `panopto`, or `other` |
| `validateNumber()` | Number validation | Range, integer, required, zero-check |
| `validateDate()` | Date string validation | YYYY-MM-DD format, reasonable range (2000-2100) |
| `validateTime()` | Time string validation | HH:MM format regex |
| `validateImportedData()` | Full import data structure | Validates semesters array, courses, recordings structure; returns warnings |

All validators return a consistent `{valid: boolean, value: *, error: string|null}` shape.

**Regex Patterns (`VALIDATION_PATTERNS`):**
- `URL` — `^https?:\/\/[^\s<>'"]+$`
- `YOUTUBE_URL` — YouTube/youtu.be detection
- `PANOPTO_URL` — Panopto detection
- `COURSE_NUMBER` — Alphanumeric up to 20 chars
- `TIME_FORMAT` — `HH:MM` validation
- `DATE_FORMAT` — `YYYY-MM-DD` validation
- `UUID` — Standard UUID format

### 6.3 `error-handling.js` — Error Handling & Retry Logic

Provides consistent, user-friendly error handling across the application.

**Key Components:**

- **`ERROR_CONFIG`** — Retry settings: max 3 retries, 1s initial delay, 10s max delay, 2x backoff
- **`ERROR_MESSAGES`** — User-friendly messages for common error codes (network errors, Firebase errors, storage errors)
- **`extractErrorCode(error)`** — Normalizes various error types into standard codes (Firebase codes, DOMExceptions, fetch errors)
- **`getUserFriendlyError(error)`** — Maps error codes to plain-English messages
- **`isRetryableError(error)`** — Determines if an error should be retried (permission/auth errors are not retried)
- **`calculateBackoffDelay(attempt)`** — Exponential backoff with ±20% jitter
- **`withRetry(fn, options)`** — Wraps async functions with automatic retry on failure
- **`safeExecute(fn, options)`** — Wraps operations with error handling and toast notifications on failure

**Global Error Handlers:**
- `setupGlobalErrorHandler()` — Catches unhandled errors and promise rejections, shows toast notifications
- `setupOfflineHandling()` — Detects online/offline state, triggers auto-sync on reconnect

### 6.4 `state.js` — State Management & Data Persistence

The heart of the application's data layer. Manages the global `appData` object, profile system, and localStorage persistence with compact serialization.

**Global State Variables:**
- `appData` — Main application data
- `currentSemesterId` — Currently selected semester
- `profiles` — List of user profiles `[{id, name}]`
- `activeProfileId` — Currently active profile ID
- `timeInterval` — Interval for current-time line updates

**Compact/Hydrate System:**

The module implements a two-way transformation:

1. **`compactForStorage(data)`** → Reduces full data to minimal JSON using abbreviated keys
   - `compactSettings()`, `compactSemester()`, `compactCourse()`, `compactRecordingTab()`, `compactRecordingItem()`, `compactHomework()` — Recursive compaction
   
2. **`hydrateFromStorage(compact)`** → Restores full structure from compact format
   - `hydrateSettings()`, `hydrateSemester()`, `hydrateCourse()`, `hydrateRecordingTabs()`, `hydrateRecordingItem()`, `hydrateHomework()` — Recursive hydration with default value injection

**Legacy Migration:**
- `migrateData(data)` — Handles pre-v2 data format, ensuring all required fields exist
- `migrateCourse(course)` — Migrates legacy `lectures` array to tabbed `recordings` structure

**Data Operations:**
- `loadData()` → `loadProfiles()` → `loadActiveProfile()` → `loadProfileData()` → `initializeCurrentSemester()` → `renderAll()` → `startTimeUpdater()`
- `saveData()` — Serializes `appData` to compact format and writes to localStorage

### 6.5 `utils.js` — Utility Functions

Pure helper functions with no side effects, organized into categories:

**DOM Helpers:**
- `$(id)` — Shorthand for `document.getElementById`
- `escapeHtml(text)` — XSS prevention by escaping `&`, `<`, `>`, `"`, `'`

**Data Accessors:**
- `getCurrentSemester()` — Gets the active semester from `appData`
- `getCourse(courseId)` — Gets a course by ID from the current semester

**Date Utilities:**
- `convertDateFormat(dateStr)` — Converts `dd-MM-yyyy` to `yyyy-MM-dd`
- `parseICSDate(icsDate)` — Parses ICS format (`20241027T103000`) to `Date`
- `getCurrentWeekRange()` — Returns `{start, end}` of current week
- `isDateInCurrentWeek(dateStr)` — Checks if a date is in the current week
- `getDayOfWeekFromDate(dateStr)` — Returns day-of-week number

**Semester Utilities:**
- `compareSemesters(a, b)` — Sorts semesters newest-first (year descending, then season: Winter > Summer > Spring)
- `extractYear(name)` — Extracts year number from semester name
- `getSeasonValue(name)` — Assigns numeric priority to seasons, supports Hebrew names

**Color Utilities:**
- `extractHueFromColor(color)` — Extracts hue from HSL string
- `getNextAvailableHue()` — Calculates next hue for a new course based on theme
- `generateCourseColor(index, total)` — Generates HSL color from index using golden angle distribution

**String Utilities:**
- `truncate(str, maxLength)` — Truncates with ellipsis
- `generateId()` — Generates unique IDs (`Date.now() + random`)

**Video Embed Utilities:**
- `detectVideoPlatform(url)` — Returns `'youtube'`, `'panopto'`, or `'unknown'`
- `getVideoEmbedInfo(url)` — Extracts embed URLs for inline preview
- `supportsInlinePreview(url)` — Checks if a URL can be embedded

### 6.6 `toast.js` — Toast Notification System

A full-featured, accessible toast notification system at the bottom-right of the screen.

**Features:**
- Four types: `success`, `error`, `warning`, `info` — each with distinct icon and color
- Auto-dismiss with configurable duration (4s default, 6s for errors)
- Animated progress bar showing remaining time
- Maximum 5 visible toasts; oldest removed when limit exceeded
- Dismiss by clicking the X button
- Optional action button with callback
- Optional description text
- `aria-live` regions for screen reader accessibility
- Slide-in/slide-out animations

**API:**
```javascript
ToastManager.success('Course updated');
ToastManager.error('Failed to save', { description: 'Check storage' });
ToastManager.warning('Profile created locally. Cloud sync failed.');
ToastManager.info('Syncing...', { persistent: true, progress: false });
```

### 6.7 `theme.js` — Theme Management

Manages two independent theming systems:

**1. Dark/Light Mode:**
- `initTheme()` — Applies saved theme on load
- `toggleTheme()` — Toggles `body.dark-mode` class
- `applyTheme(theme, shouldSave)` — Applies and optionally persists

**2. Course Color Themes:**
Three schemes for course card colors:
- **Colorful (Rainbow)** — Each course gets a distinct hue using the 137° golden angle
- **Monochromatic (Single)** — All courses use shades within ±30° of a configurable base hue
- **Grayscale (Mono)** — All courses are `hsl(0, 0%, 50%)` gray

**Functions:**
- `updateBaseColorPreview()` — Live preview of base hue in settings
- `resetAllColors()` — Recalculates all course colors for current theme
- `updateCourseColorSlider()` — Adjusts the hue slider range based on active theme

### 6.8 `firebase-sync.js` — Cloud Sync via Firebase

Implements real-time cross-device synchronization using Firebase Authentication (Google) and Realtime Database. Runs as an **IIFE** (Immediately Invoked Function Expression) to encapsulate internal state.

**Architecture:**
- Each user gets a single database node: `tollab/users/{uid}/data`
- The node contains a **payload** with ALL profiles (not just the active one)
- On sign-in, local data and cloud data are **merged**
- On local changes, the payload is **debounced** and pushed to the cloud
- A realtime listener receives remote changes and applies them locally

**Key Mechanisms:**

1. **Client ID Deduplication** — Each browser tab generates a `clientId` and a `writeId`. Remote updates from the same client/write are ignored to prevent echo loops.

2. **Merge Strategy (`mergeLocalAndCloud`):**
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

4. **Compact Format in Cloud:**
   - Uses the same `compactForStorage` format as localStorage
   - Legacy v1 cloud format is automatically migrated to v2

**Exposed Global Functions:**
- `initializeFirebaseSync()` — Sets up Firebase and auth state listener
- `autoSyncToFirebase()` — Debounced sync (called after every `saveData()`)
- `forceSyncToFirebase()` — Immediate sync (called on profile create/delete/rename)

### 6.9 `profile.js` — Profile Management

Manages multiple independent user profiles, each with their own full `appData`:

**CRUD Operations:**
- `createProfile()` — Prompts for name, creates with empty data, syncs to cloud
- `switchProfile(id)` — Switches active profile, reloads data, re-renders
- `renameProfile()` — Prompt dialog with uniqueness validation, bumps `lastModified`
- `deleteProfile()` — Confirmation dialog, handles last-profile edge case by creating a new default

**Export/Import:**
- `exportProfile()` — Downloads current profile as timestamped JSON file (`tollab-profilename-YYYY-MM-DD.json`)
- `importProfile(file)` — Reads JSON file, validates structure, creates new profile with unique name

**Cloud Integration:**
- All CRUD operations call `forceSyncToFirebase()` after completion
- Profile rename bumps `lastModified` to ensure it wins merge conflicts

**UI Rendering:**
- `renderProfileUI()` — Updates the profile dropdown and button states in the settings modal

### 6.10 `video-fetch.js` — External Video Fetching

Imports lecture recordings from external platforms with robust error handling:

**YouTube Playlist Import:**
1. Extracts playlist ID from URL
2. Fetches playlist page HTML through CORS proxy
3. Parses video titles and IDs from HTML
4. Creates recording items with YouTube embed URLs

**Panopto Import (two methods):**
1. **Console Script Method** — User runs a JavaScript snippet in the browser console on the Panopto folder page; it copies video data to clipboard as JSON; user pastes into Tollab
2. Video selection UI with checkboxes for choosing which videos to import

**CORS Proxy System:**
- Three proxy services configured, tried in order
- Per-proxy retry with exponential backoff + jitter
- Rate limiting (429) detection with extended backoff
- Network error detection with proxy fallback
- Timeout handling via `AbortController`
- Progress callback for UI updates

**Configuration:**
```javascript
FETCH_CONFIG = {
    MAX_RETRIES_PER_PROXY: 2,
    INITIAL_RETRY_DELAY: 500ms,
    MAX_RETRY_DELAY: 5000ms,
    BACKOFF_MULTIPLIER: 2,
    FETCH_TIMEOUT: 15000ms
}
```

### 6.11 `header-ticker.js` — Header Ticker & Fun Reminders

A rotating message bar below the header that shows **context-aware, playful reminders** based on the student's current academic state.

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
- A **crossfade animation** alternates between two `<span>` elements for smooth transitions
- Rotation interval configurable; messages prioritized by urgency

### 6.12 `render.js` — UI Rendering Engine

The largest module, responsible for rendering every visual component from the `appData` state.

**Main Render Cycle:**
```
renderAll()
├── renderSemesters()         → Semester dropdown
├── renderCourses()           → Course card list
├── renderCalendar()          → Weekly schedule grid
├── renderHomeworkSidebar()   → Upcoming homework sidebar
└── renderHeaderTicker()      → Context-aware ticker
```

**Semester Rendering:**
- Populates a `<select>` dropdown sorted newest-first

**Course Card Rendering:**
- Each course rendered as a card with:
  - Color-coded left border (based on course color)
  - Course title, faculty, lecturer, location, notes
  - Progress indicators for lectures watched, tutorials watched, homework completed
  - Reorder buttons (up/down arrows)
  - Metadata row (course number, points, grade)

**Calendar Rendering:**
- Creates a CSS Grid layout for the weekly schedule
- Time axis (configurable hours)
- Day columns (configurable visible days)
- Event chips positioned absolutely based on time slots
- Current time line indicator
- Configurable via per-semester `calendarSettings`

**Recording Rendering:**
- Tab bar with count badges
- Sort controls (dropdown with 6 sort options)
- Recording items with:
  - Watched checkbox
  - Video link with platform detection (YouTube/Panopto icons)
  - Inline video preview (iframe embed for YouTube/Panopto)
  - External link button
  - Slides link
  - Edit section (expandable)
  - Reorder buttons (in manual sort mode only)

**Homework Sidebar Rendering:**
- Groups homework by urgency: overdue → today → this week → upcoming → no date
- Each item shows: course name, title, due date, completion toggle
- "Show Done" toggle to hide/show completed items

### 6.13 `modals.js` — Modal Dialog Management

Manages all modal dialogs in the application:

**Generic Modal Functions:**
- `openModal(id)` — Shows modal overlay with body scroll lock
- `closeModal(id)` — Hides modal, restores scroll when no modals remain
- `resetModalScroll()` — Scrolls modal body to top

**Course Modal (the main editing interface):**
- Three tabs: **Recordings**, **Homework**, **Details**
- `openCourseModal(courseId, initialTab, highlight)`:
  - If `courseId` is null → "Add Course" mode (only Details tab shown)
  - If `courseId` exists → "Edit Course" mode (all three tabs shown)
  - `highlight` parameter supports jumping to a specific homework item or exam field

**Specialized Modals:**
- Add Semester modal
- Fetch Videos modal (YouTube/Panopto import)
- Sync Conflict Resolution modal (cloud vs local data)
- Settings modal (4 tabs: Profile, Appearance, Calendar, Fetch Data)

**Dialog Helpers (promised-based):**
- `showConfirmDialog(message, options)` → Returns `true`/`false`
- `showPromptDialog(message, defaultValue, options)` → Returns string or `null`
- `showAlertDialog(message, options)` → Returns when dismissed

### 6.14 `course-logic.js` — Course CRUD Operations

**Course Operations:**
- `saveCourse()` — Validates input, builds course data, creates or updates
- `buildCourseData(name)` — Collects all form values into a course object
- `createNewCourse(semester, data)` — Pushes new course with default recordings structure
- `updateExistingCourse(semester, data)` — Updates existing course via `Object.assign`
- `deleteCourse()` — Confirmation dialog, removes from array, re-renders
- `moveCourse(index, direction)` — Reorders courses via array swap

**Semester Options:**
- `populateSemesterOptions()` — Generates 9 options (3 years × 3 seasons) plus "Custom..."

### 6.15 `item-logic.js` — Recordings, Homework & Schedule Items

**Video Preview:**
- `toggleVideoPreview(index, embedUrl)` — Opens/closes inline iframe preview
- `closeVideoPreview(index)` — Removes iframe and clears preview state
- Only one preview can be open at a time

**Recording CRUD:**
- `addRecording()` — Adds recording from URL input with auto-generated name
- `deleteRecording(courseId, tabId, index)` — Confirmation → splice
- `toggleRecordingStatus(courseId, tabId, index)` — Toggle watched
- `saveRecordingEdit(courseId, tabId, index)` — Updates name, video link, slides link
- `moveRecording(courseId, tabId, index, direction)` — Reorder in manual sort mode

**Recording Tab Management:**
- `addRecordingsTab()` — Prompt for name, creates custom tab
- `renameRecordingsTab()` — Prompt with validation
- `clearRecordingsTab()` — Removes all items from a tab
- `deleteRecordingsTab()` — Protected tabs (lectures/tutorials) cannot be deleted

**Homework CRUD:**
- `addHomework()` — Creates from title + date inputs
- `deleteHomework(courseId, index)` — Confirmation → splice
- `toggleHomeworkStatus(courseId, index)` — Toggle completion
- `updateHomeworkNotes(courseId, index)` — Saves notes text
- `addHomeworkLink(courseId, index)` — Adds link with label to homework

**Sort System:**
- `sortRecordings(items, order)` — Sorts by name, watched status, or manual order
- `sortHomework(items, order)` — Sorts by date, completion, or name
- `getRecordingsSortOrder() / setRecordingsSortOrder()` — Per-tab sort preference

### 6.16 `import-export.js` — ICS Import & Technion Data Fetch

**Cheesefork ICS Import:**
1. User pastes ICS URL from Cheesefork
2. App first tries fetching the `.json` variant (richer metadata)
3. Falls back to parsing raw `.ics` content
4. Supports **batch import** — specify start/end semester and year; iterates through all semesters in range

**ICS Parsing (`parseICS`):**
- Splits content by `BEGIN:VEVENT`
- Extracts: `SUMMARY`, `DTSTART`, `DTEND`, `LOCATION`, `RRULE`
- Detects weekly recurring events (lectures) vs one-time events (exams)
- Groups events by course number
- Creates course objects with schedule slots and exam dates
- Handles Hebrew-to-English semester name translation

**Technion Course Catalog (`fetchTechnionData`):**
- Fetches from `michael-maltsev/technion-sap-info-fetcher` (GitHub Pages)
- Enriches existing courses with: full name, lecturer, faculty, credits, exam dates
- Matches by course number

**Import Processing:**
- `processImportedData(courses, semesterName)` — Creates or finds semester, merges courses
- `findExistingCourse(semester, imported)` — Matches by number or name substring
- `updateExistingCourseExams(existing, imported)` — Updates exam dates if missing
- `createImportedCourse(imported, index, total)` — Creates full course with theme-aware color

### 6.17 `events.js` — Event Listeners & Handlers

Sets up all DOM event listeners, organized by feature:

**`setupEventListeners()`** calls:
- `setupSemesterEvents()` — Semester select/add/delete
- `setupCourseEvents()` — Course add/save/delete, color slider, schedule, tab switching
- `setupRecordingsEvents()` — Recording add, tab management, video fetch modal, Panopto import
- `setupHomeworkEvents()` — Homework add, show-completed toggle, mobile scroll button
- `setupSettingsEvents()` — Settings modal, calendar config, ICS sync, Technion fetch, color reset
- `setupProfileEvents()` — Profile create/rename/delete, cloud connect/disconnect, export/import
- `setupColorThemeEvents()` — Color theme selector, base hue slider with live preview
- `setupMobileDayToggle()` — Mobile single-day calendar view toggle

**Notable Patterns:**
- Keyboard shortcut: Enter key adds recordings
- Clipboard integration for Panopto console script
- Batch sync toggle shows/hides date range inputs
- File input for JSON import (hidden, triggered by button)

### 6.18 `main.js` — Application Entry Point

The last module loaded. Has two responsibilities:

**1. Initialization** (on `DOMContentLoaded`):
```
setupGlobalErrorHandler()
setupOfflineHandling()
loadData()
initTheme()
setupEventListeners()
renderProfileUI()
initializeFirebaseSync()
startHeaderTickerRotation()
Hide calendar on mobile (< 768px)
```

**2. Global Function Exports** — Exposes ~40 functions to `window.*` for use in HTML `onclick` handlers:
- Core UI: `toggleTheme`, `closeModal`, `openCourseModal`
- Recordings: `toggleRecordingStatus`, `deleteRecording`, `addRecordingsTab`, etc.
- Homework: `toggleHomeworkStatus`, `deleteHomework`, `openHomeworkFromSidebar`, etc.
- Course: `moveCourse`, `removeScheduleItem`

---

## 7. CSS Architecture

The CSS is split into 7 modular files — no preprocessor, no CSS-in-JS, no utility framework.

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
4. Copy web app config to `js/firebase-config.js`

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
              d: { ... compact appData ... }
            }
          ]
```

### Sync Flow

```
Local Change → saveData() → autoSyncToFirebase() (debounced)
                                    ↓
                          buildLocalPayload()
                                    ↓
                          saveCloudPayload(uid, payload)
                                    ↓
                          Realtime listener on other device
                                    ↓
                          writeMergedToLocalStorage()
                                    ↓
                          loadData() + renderAll()
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

- **Jest** with `jsdom` environment for DOM simulation
- Test files in `tests/` directory matching `*.test.js` pattern
- Setup file (`tests/setup.js`) mocks:
  - `localStorage` (full mock with `getItem`, `setItem`, `removeItem`, `clear`)
  - Global `$()` helper
  - Console methods (suppressed for clean output)
  - Global constants (`VALIDATION_LIMITS`, `VALIDATION_PATTERNS`, etc.)
  - `ToastManager` (all methods mocked)

### Test Coverage

Coverage thresholds set in `package.json`:
```json
{
  "branches": 50,
  "functions": 50,
  "lines": 50,
  "statements": 50
}
```

### Test Suites

**`utils.test.js`** — Tests for utility functions:
- `escapeHtml` — HTML entity escaping for all special characters, null handling
- `generateUUID` — Format validation, uniqueness across 100 generations
- `formatDate` — Date formatting with zero-padding
- `throttle` — Call frequency limiting with timer verification
- `debounce` — Delayed execution with reset behavior
- `getContrastColor` — Black/white text selection based on background luminance
- `truncateText` — String truncation with ellipsis

**`validation.test.js`** — Tests for validation functions:
- `validateString` — Required, trim, length limits, patterns, null/number coercion
- `validateCourseName` — Empty, valid, too-long names
- `validateUrl` — HTTP/HTTPS, invalid, FTP rejection, required/optional
- `validateVideoUrl` — YouTube, Panopto, Vimeo detection
- `validateNumber` — Integer, range, NaN, zero, optional
- `validateDate` — Format, range, empty optional

### Running Tests

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode for development
```

---

## 11. Security Considerations

### XSS Prevention
- All user-generated content is passed through `escapeHtml()` before rendering to the DOM
- The function escapes: `&`, `<`, `>`, `"`, `'`
- Video embed URLs are sanitized and only YouTube/Panopto embed URLs are allowed in iframes

### URL Validation
- All URLs are validated using the `URL` constructor
- Only `http:` and `https:` protocols are allowed
- Maximum URL length: 2048 characters
- Video URLs are validated for platform detection before embedding

### Input Sanitization
- All text inputs are trimmed and length-limited
- Course numbers validated against alphanumeric pattern
- Time and date formats validated against strict regex patterns
- Imported data undergoes structural validation before processing

### Firebase Security
- Database rules restrict reads/writes to authenticated users' own data
- Google OAuth provides strong authentication
- Firebase credentials are kept in a gitignored config file
- The example config (`firebase-config.example.js`) contains only placeholder values

### CORS Proxy Usage
- External data is fetched through CORS proxies (necessary for a static frontend)
- Response data is parsed and validated before use
- Timeout and rate limiting protections are in place

---

## 12. Deployment

### GitHub Pages

The application is deployed as a static site on GitHub Pages:
- **Custom domain**: `tollab.co.il` (configured via `CNAME` file)
- **No build step**: HTML/CSS/JS served directly
- **Firebase config**: Generated at deploy time from GitHub Secrets (the `firebase-config.js` file is not committed)

### Local Development

```bash
# Clone the repository
git clone https://github.com/itabajah/Tollab.git
cd Tollab

# Install dev dependencies (Jest, ESLint, etc.)
npm install

# Create Firebase config for local development
cp js/firebase-config.example.js js/firebase-config.js
# Edit js/firebase-config.js with your Firebase project credentials

# Start local server
npm run serve    # Starts http-server on port 8080

# Run tests
npm test

# Lint JavaScript
npm run lint
npm run lint:fix

# Validate HTML
npm run validate
```

### Scripts (from `package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `jest --coverage` | Run tests with coverage report |
| `test:watch` | `jest --watch` | Watch mode |
| `lint` | `eslint js/*.js` | Lint all JS files |
| `lint:fix` | `eslint js/*.js --fix` | Auto-fix lint issues |
| `serve` | `npx http-server -p 8080 -o` | Start local dev server |
| `validate` | `html-validate index.html` | Validate HTML |

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
- Compact storage format for efficient localStorage usage

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

*This documentation was generated from a comprehensive analysis of the Tollab codebase. For the latest updates, refer to the source code directly.*
