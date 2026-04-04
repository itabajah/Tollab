# Tollab v2: Full TypeScript Migration — Squad Prompt

Tollab squad: execute the full TypeScript migration program now. This is a complete architectural rewrite of the Tollab academic management app — from a zero-build, global-scope vanilla JavaScript SPA to a modern, modular, type-safe TypeScript application with proper build tooling, component architecture, comprehensive testing, and CI/CD. The current UI must be preserved pixel-perfect; this is a systems migration, not a redesign.

---

## Hard Rules

1. **Always use claude-opus-4.6 for every agent spawn, no exceptions.**
2. Re-read `DOCUMENTATION.md` before starting, before each wave, and before any wave is declared complete. It is the single source of truth for current behavior.
3. **Never push to `main`.** All work happens on `squad-branch` or sub-branches created from it (e.g., `squad-branch/wave-1-tooling`, `squad-branch/wave-2-types`). Use PRs from sub-branches into `squad-branch` for each wave.
4. Every PR must pass CI checks (lint, typecheck, test, build) before merge. No `--no-verify`, no force pushes, no skipping gates.
5. The existing UI must remain visually identical. Same layout, same colors, same animations, same responsive behavior. No "improvements" to the design. If in doubt, screenshot the current app and compare.
6. Every module migration must maintain full feature parity with the original JS. No features dropped, no behaviors changed.
7. No merge without the required reviewer gates defined below.
8. Every task must reference a GitHub issue, declare its wave, and define an exit test.
9. Commits must be atomic, well-messaged, and scoped (e.g., `feat(types): add Course and Semester interfaces`, `refactor(state): migrate state.js to TypeScript module`).
10. Use GitHub Issues for tracking, GitHub PRs for code review, and GitHub Actions for CI.
11. **No migration code, no backward compatibility code, no legacy format support.** Do not write any `migrateData()`, `normalizeCloudPayload()`, `hydrateFromStorage()`, or compact-key abbreviation logic. The old localStorage data and old Firebase cloud format are dead. This is a clean-slate rewrite. Users will start fresh.
12. **No compact storage format.** Store data in localStorage and Firebase using the full, readable, typed interfaces directly (e.g., `{ name: "...", id: "..." }`, not `{ n: "...", i: "..." }`). Remove all existing compact/hydrate code from the JS codebase as part of the migration.

---

## Current Repo Facts

1. The repo is on `squad-branch` at commit `73b7b2c`, one commit ahead of `main` (`38639fb`).
2. The app is a **zero-build vanilla JS SPA** — 18 JS modules loaded via `<script>` tags in dependency order, communicating through global scope (`window.*`).
3. Total codebase: ~9,800 lines of JS, ~4,300 lines of CSS, ~645 lines of HTML.
4. The largest files are: `components.css` (2,360 lines), `header-ticker.js` (1,329 lines), `render.js` (1,033 lines), `item-logic.js` (983 lines), `events.js` (877 lines).
5. State is managed via a single mutable global `appData` object with direct mutation + `saveData()` + `renderAll()` pattern.
6. All JS functions are global — `main.js` exports ~40 functions to `window.*` for use in inline `onclick` handlers in HTML.
7. Data persistence uses `localStorage` with a custom compact serialization format that abbreviates keys (`name` → `n`, `id` → `i`, etc.). **The new version must NOT carry over this compact format or any legacy migration code. Design a clean storage schema from scratch.**
8. Firebase sync uses the compat SDK (v9.23.0) loaded from CDN, wrapped in an IIFE in `firebase-sync.js`.
9. Tests exist only for `utils.js` and `validation.js` (2 test files, ~476 lines). Coverage threshold is 50%.
10. `firebase-config.js` is gitignored; `firebase-config.example.js` has placeholder values.
11. There are several stale branches: `feature/full-migration`, `upgrade-to-v2-(migrate-to-ts)`, `feature/ui-split-pane` — ignore them, start fresh.
12. The CSS uses pure CSS Custom Properties for theming (light/dark mode) with no preprocessor.
13. HTML has extensive inline styles in `index.html` (~645 lines) mixed with structural markup and SVG icons.
14. The old code has `migrateData()`, `migrateCourse()`, `compactForStorage()`, `hydrateFromStorage()`, `normalizeCloudPayload()` and other legacy compatibility code — **all of this must be deleted and not rewritten**. The new app uses clean typed storage only.

---

## Target Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| **Language** | TypeScript 5.x (strict mode) |
| **Build Tool** | Vite 6.x |
| **UI Framework** | Preact (lightweight React-compatible — keeps bundle small for GitHub Pages) |
| **State Management** | Zustand (lightweight, TypeScript-first) |
| **Styling** | Keep existing CSS files — CSS Modules or scoped imports via Vite, preserve all CSS Custom Properties |
| **Firebase** | Firebase modular SDK v10+ (tree-shakeable `firebase/auth`, `firebase/database`) |
| **Testing** | Vitest + Testing Library (Preact) + Playwright for E2E |
| **Linting** | ESLint flat config + typescript-eslint + Prettier |
| **CI** | GitHub Actions (lint, typecheck, test, build, preview deploy) |
| **Hosting** | GitHub Pages (Vite build output to `dist/`) |

### Project Structure (Target)
```
Tollab/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR checks: lint, typecheck, test, build
│       └── deploy.yml                # Deploy to GitHub Pages on main push
├── public/
│   ├── favicon.svg
│   └── CNAME
├── src/
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component
│   ├── types/
│   │   ├── index.ts                  # Re-exports
│   │   ├── semester.ts               # Semester, CalendarSettings
│   │   ├── course.ts                 # Course, ScheduleSlot, Exams
│   │   ├── recording.ts              # RecordingTab, RecordingItem
│   │   ├── homework.ts               # Homework, HomeworkLink
│   │   ├── profile.ts                # Profile, ProfileData
│   │   └── settings.ts               # AppSettings, ColorTheme, SortOrder
│   ├── constants/
│   │   ├── index.ts
│   │   ├── sort-orders.ts
│   │   ├── calendar.ts
│   │   ├── storage-keys.ts
│   │   ├── themes.ts
│   │   ├── api.ts
│   │   ├── semesters.ts
│   │   ├── ui.ts
│   │   └── validation.ts
│   ├── store/
│   │   ├── app-store.ts              # Zustand store (replaces global appData)
│   │   ├── profile-store.ts          # Profile management store
│   │   ├── ui-store.ts               # UI transient state (modals, tabs, editing)
│   │   └── selectors.ts              # Derived state selectors
│   ├── services/
│   │   ├── storage.ts                # localStorage persistence (clean JSON)
│   │   ├── firebase-auth.ts          # Google Auth
│   │   ├── firebase-sync.ts          # Realtime Database sync
│   │   ├── cors-proxy.ts             # CORS proxy fetch with retry
│   │   ├── youtube.ts                # YouTube playlist fetching
│   │   ├── panopto.ts                # Panopto import
│   │   ├── cheesefork.ts             # ICS import & parsing
│   │   └── technion-catalog.ts       # SAP course data fetching
│   ├── utils/
│   │   ├── dom.ts                    # escapeHtml, etc.
│   │   ├── date.ts                   # Date utilities
│   │   ├── color.ts                  # HSL color utilities
│   │   ├── string.ts                 # truncate, generateId
│   │   ├── semester.ts               # compareSemesters, extractYear
│   │   ├── video.ts                  # detectPlatform, getEmbedInfo
│   │   ├── validation.ts             # All validators
│   │   ├── error-handling.ts         # withRetry, safeExecute, backoff
│   │   └── ics-parser.ts             # ICS file parsing
│   ├── hooks/
│   │   ├── useCurrentSemester.ts
│   │   ├── useCourse.ts
│   │   ├── useTickerMessages.ts
│   │   ├── useFirebaseSync.ts
│   │   ├── useTheme.ts
│   │   └── useCalendarTime.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── HeaderTicker.tsx
│   │   │   ├── SemesterControls.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── Footer.tsx
│   │   ├── courses/
│   │   │   ├── CourseList.tsx
│   │   │   ├── CourseCard.tsx
│   │   │   └── CourseProgress.tsx
│   │   ├── calendar/
│   │   │   ├── WeeklySchedule.tsx
│   │   │   ├── TimeGrid.tsx
│   │   │   ├── EventChip.tsx
│   │   │   └── CurrentTimeLine.tsx
│   │   ├── homework/
│   │   │   ├── HomeworkSidebar.tsx
│   │   │   ├── HomeworkItem.tsx
│   │   │   └── HomeworkEditor.tsx
│   │   ├── recordings/
│   │   │   ├── RecordingsPanel.tsx
│   │   │   ├── RecordingsTabs.tsx
│   │   │   ├── RecordingItem.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   └── RecordingEditor.tsx
│   │   ├── modals/
│   │   │   ├── Modal.tsx              # Generic modal wrapper
│   │   │   ├── CourseModal.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── AddSemesterModal.tsx
│   │   │   ├── FetchVideosModal.tsx
│   │   │   ├── SyncConflictModal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── PromptDialog.tsx
│   │   │   └── AlertDialog.tsx
│   │   ├── settings/
│   │   │   ├── ProfileTab.tsx
│   │   │   ├── AppearanceTab.tsx
│   │   │   ├── CalendarTab.tsx
│   │   │   └── FetchDataTab.tsx
│   │   ├── toast/
│   │   │   ├── ToastContainer.tsx
│   │   │   └── Toast.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── IconButton.tsx
│   │       ├── Select.tsx
│   │       └── Checkbox.tsx
│   └── css/                          # Existing CSS files (migrated as-is)
│       ├── base.css
│       ├── layout.css
│       ├── components.css
│       ├── calendar.css
│       ├── modals.css
│       ├── toast.css
│       └── utils.css
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   ├── services/
│   │   ├── store/
│   │   └── validation/
│   ├── integration/
│   │   ├── course-crud.test.tsx
│   │   ├── semester-management.test.tsx
│   │   ├── recording-management.test.tsx
│   │   ├── homework-management.test.tsx
│   │   ├── profile-management.test.tsx
│   │   └── import-export.test.tsx
│   ├── e2e/
│   │   ├── app-lifecycle.spec.ts
│   │   ├── course-workflow.spec.ts
│   │   └── settings.spec.ts
│   └── setup.ts
├── index.html                        # Vite entry HTML (minimal — Preact mounts to #app)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── .eslintrc.cjs
├── .prettierrc
└── DOCUMENTATION.md
```

---

## Team Roster

### Leadership & Architecture

| Name | Role | Responsibility |
|------|------|---------------|
| **Amir** | **Tech Lead / Architect** | Owns architecture decisions, wave sequencing, issue triage, traceability, and final sign-off on every wave. Reviews every PR that touches more than 2 modules. Defines component boundaries, store shape, and module contracts. |
| **Nadia** | **System Designer** | Designs the type system, store structure, service interfaces, and hook contracts. Writes ADRs (Architecture Decision Records) for key decisions. Reviews all type definitions and store changes. |
| **Tariq** | **System Designer (Data)** | Owns the storage format, Firebase data model, and serialization contracts. Designs the clean v2 storage schema from scratch — no legacy format support. |

### Frontend Development

| Name | Role | Responsibility |
|------|------|---------------|
| **Layla** | **Senior Frontend Dev (Components)** | Migrates `render.js` (1,033 lines), `modals.js` (289 lines), and all UI components to Preact. Owns `components/layout/`, `components/courses/`, `components/modals/`. |
| **Omar** | **Senior Frontend Dev (Components)** | Migrates `item-logic.js` (983 lines) — recordings panel, homework editor, video preview. Owns `components/recordings/`, `components/homework/`. |
| **Dina** | **Frontend Dev (Calendar & Ticker)** | Migrates `header-ticker.js` (1,329 lines) and calendar rendering from `render.js`. Owns `components/calendar/`, `components/layout/HeaderTicker.tsx`. |
| **Sami** | **Frontend Dev (Settings & Modals)** | Migrates settings modal (4 tabs), profile UI, theme management, toast system. Owns `components/settings/`, `components/toast/`, `components/ui/`. |

### State & Services

| Name | Role | Responsibility |
|------|------|---------------|
| **Farid** | **State Management Dev** | Migrates `state.js` (497 lines) to Zustand stores. Implements `app-store.ts`, `profile-store.ts`, `ui-store.ts`, selectors. Owns `store/` directory. |
| **Hana** | **Services Dev (Firebase)** | Migrates `firebase-sync.js` (503 lines) from compat SDK IIFE to modular Firebase v10+ with proper TypeScript types. Owns `services/firebase-auth.ts`, `services/firebase-sync.ts`. |
| **Rami** | **Services Dev (External)** | Migrates `video-fetch.js` (667 lines), `import-export.js` (674 lines) — CORS proxy, YouTube/Panopto fetch, ICS parsing, Technion catalog. Owns `services/` (except Firebase). |

### Quality & Testing

| Name | Role | Responsibility |
|------|------|---------------|
| **Yasmin** | **Senior Test Engineer** | Designs test strategy, writes integration tests for all CRUD flows (course, semester, recording, homework, profile). Owns `tests/integration/`. Target: 80%+ coverage. |
| **Karim** | **Test Engineer (Unit)** | Writes unit tests for all utilities, validators, services, and store slices. Migrates existing `utils.test.js` and `validation.test.js`. Owns `tests/unit/`. |
| **Lina** | **E2E Test Engineer** | Writes Playwright E2E tests covering the full app lifecycle. Owns `tests/e2e/`. |

### Review & Quality Gates

| Name | Role | Responsibility |
|------|------|---------------|
| **Zara** | **Architecture Reviewer** | Reviews every PR for architectural consistency, proper module boundaries, no circular dependencies, correct use of stores vs props vs hooks. Must approve any PR that changes types, store shape, or service interfaces. |
| **Malik** | **Code Quality Reviewer** | Reviews every PR for TypeScript best practices, proper error handling, no `any` types, no type assertions without justification, idiomatic Preact patterns. |
| **Noura** | **UI Fidelity Reviewer** | Reviews every PR that touches components or CSS. Compares rendered output against the original app. Rejects any PR that introduces visual regressions. |
| **Jad** | **Security Reviewer** | Reviews every PR that touches Firebase, CORS proxies, URL handling, user input, or localStorage. Ensures XSS prevention, proper sanitization, and secure Firebase rules. |

### DevOps & Infrastructure

| Name | Role | Responsibility |
|------|------|---------------|
| **Khalil** | **DevOps / CI Engineer** | Sets up Vite config, GitHub Actions CI/CD, TypeScript config, ESLint/Prettier config, Vitest config. Owns `.github/workflows/`, `vite.config.ts`, `tsconfig.json`, `package.json`. |

### Documentation

| Name | Role | Responsibility |
|------|------|---------------|
| **Rana** | **Technical Writer** | Updates `DOCUMENTATION.md` to reflect the new architecture. Writes JSDoc/TSDoc for all public APIs. Documents migration decisions and new developer onboarding. |

**Total: 19 team members** (3 leadership, 4 frontend, 3 state/services, 3 testing, 4 reviewers, 1 devops, 1 docs)

---

## Reviewer Gates

Every PR requires approval from the designated reviewers before merge:

| PR Scope | Required Reviewers |
|----------|-------------------|
| Types / Interfaces (`src/types/`) | Nadia, Tariq |
| Store (`src/store/`) | Nadia, Zara, Farid |
| Services (`src/services/`) | Zara, Jad |
| Components (`src/components/`) | Malik, Noura |
| CSS changes | Noura |
| Firebase / Auth | Jad, Hana |
| Build / CI / Config | Khalil, Zara |
| Tests | Yasmin, Malik |
| Documentation | Rana, Amir |
| Any PR touching 3+ modules | Amir, Zara |

---

## Execution Plan

### Wave 0: Foundation — Tracking, Tooling, CI (Days 1-2)

**Owner: Amir, Khalil, Nadia, Tariq**

1. **Amir** creates one umbrella GitHub issue `[Migration] Tollab v2 — Full TypeScript Migration` with child issues for every wave and every major module migration.
2. **Amir** creates child issues:
   - `[Wave 0] Project tooling setup (Vite, TypeScript, Preact, ESLint, Prettier)`
   - `[Wave 0] CI pipeline (GitHub Actions: lint, typecheck, test, build)`
   - `[Wave 1] Type system — all interfaces and enums`
   - `[Wave 1] Constants migration`
   - `[Wave 2] Zustand store — app state, profile state, UI state`
   - `[Wave 2] Storage service — clean typed persistence`
   - `[Wave 3] Validation utilities migration`
   - `[Wave 3] Error handling utilities migration`
   - `[Wave 3] Date, color, string, video utilities migration`
   - `[Wave 4] Firebase modular SDK migration`
   - `[Wave 4] CORS proxy service migration`
   - `[Wave 4] YouTube, Panopto, Cheesefork, Technion services`
   - `[Wave 5] Toast component`
   - `[Wave 5] Modal system (generic Modal, Confirm, Prompt, Alert)`
   - `[Wave 5] Layout components (Header, HeaderTicker, SemesterControls, Footer)`
   - `[Wave 6] Course components (CourseList, CourseCard, CourseModal)`
   - `[Wave 6] Calendar components (WeeklySchedule, TimeGrid, EventChip)`
   - `[Wave 7] Recording components (RecordingsPanel, RecordingItem, VideoPreview)`
   - `[Wave 7] Homework components (HomeworkSidebar, HomeworkItem, HomeworkEditor)`
   - `[Wave 8] Settings modal (all 4 tabs) and Profile management UI`
   - `[Wave 8] Theme system migration`
   - `[Wave 9] Import/Export — ICS, Technion catalog, video fetch UI`
   - `[Wave 9] Header ticker migration (all 100+ templates)`
   - `[Wave 10] Event system migration (remove all window.* globals and onclick handlers)`
   - `[Wave 10] Main entry point and app initialization`
   - `[Wave 11] E2E tests`
   - `[Wave 11] Documentation update`
   - `[Wave 12+] Review loops (10 iterations)`
3. **Khalil** initializes the project:
   - Create `squad-branch/wave-0-tooling` from `squad-branch`
   - `npm create vite@latest` with Preact + TypeScript template
   - Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: false`
   - Set up Vitest with jsdom environment
   - Set up ESLint flat config with `@typescript-eslint`, `eslint-plugin-preact`
   - Set up Prettier
   - Move existing CSS files to `src/css/` unchanged
   - Configure Vite to handle CSS imports
   - Set up path aliases (`@/` → `src/`)
   - Create minimal `index.html` with `<div id="app"></div>`
   - Create stub `src/main.tsx` and `src/App.tsx`
   - Ensure `npm run build` produces a working static site
4. **Khalil** sets up GitHub Actions:
   - `.github/workflows/ci.yml`: On PR to `squad-branch` → lint, typecheck, test, build
   - `.github/workflows/deploy.yml`: On push to `main` → build + deploy to GitHub Pages (disabled until migration complete)
5. **Nadia** and **Tariq** review and approve the tooling PR.

**Branch**: `squad-branch/wave-0-tooling` → PR into `squad-branch`

**Exit tests**:
- `npm run build` succeeds with zero errors
- `npm run lint` passes
- `npm run typecheck` passes (tsc --noEmit)
- `npm test` passes (even if no real tests yet)
- CI workflow runs green on PR
- Stub app renders "Tollab" in the browser

---

### Wave 1: Type System & Constants (Days 2-3)

**Owner: Nadia, Tariq**

1. **Nadia** defines all TypeScript interfaces in `src/types/`:
   - `Semester`, `CalendarSettings` (with defaults as const objects)
   - `Course`, `ScheduleSlot`, `Exams`
   - `RecordingTab`, `RecordingItem`
   - `Homework`, `HomeworkLink`
   - `Profile`, `ProfileData`
   - `AppSettings`, `ColorTheme` (enum), `ThemeMode` (enum)
   - `SortOrder` (discriminated unions for recordings vs homework)
   - `ValidationResult<T>`, `VideoUrlResult`
   - `ToastType`, `ToastOptions`
   - `TickerCategory`, `TickerContext`
2. **Tariq** defines storage types directly using the full-named interfaces — no compact/abbreviated key format. Cloud payload types (`CloudPayload`, `CloudProfileEntry`) use the same clean types.
3. **Nadia** migrates `constants.js` to `src/constants/` — split by domain, all `as const` with proper typing:
   - `sort-orders.ts`, `calendar.ts`, `storage-keys.ts`, `themes.ts`, `api.ts`, `semesters.ts`, `ui.ts`, `validation.ts`

**Branch**: `squad-branch/wave-1-types` → PR into `squad-branch`

**Exit tests**:
- `npm run typecheck` passes
- All interfaces compile and are importable
- Constants are properly typed with `as const` and `Object.freeze`
- No `any` types anywhere

---

### Wave 2: State Management & Storage (Days 3-5)

**Owner: Farid, Tariq**

1. **Farid** creates Zustand stores in `src/store/`:
   - `app-store.ts`: Replaces global `appData`. Actions: `addSemester`, `deleteSemester`, `setCurrentSemester`, `addCourse`, `updateCourse`, `deleteCourse`, `moveCourse`, `updateSettings`, etc.
   - `profile-store.ts`: Manages `profiles[]`, `activeProfileId`. Actions: `createProfile`, `switchProfile`, `renameProfile`, `deleteProfile`, `exportProfile`, `importProfile`.
   - `ui-store.ts`: Transient UI state — `editingCourseId`, `currentRecordingsTab`, `tempSchedule`, `modalStack`, `tempRecordingEdit`, `tempEditLinks`, etc.
   - `selectors.ts`: `useCurrentSemester()`, `useCourseById(id)`, `useHomeworkByUrgency()`, `useCourseProgress(courseId)`, etc.
2. **Tariq** creates `src/services/storage.ts`:
   - `saveToLocalStorage(profileId: string, data: AppData): void` — serializes directly as clean JSON (no compact abbreviation)
   - `loadFromLocalStorage(profileId: string): AppData | null` — deserializes with type validation
   - No compact/hydrate layer — store the full typed objects as-is with `JSON.stringify`/`JSON.parse`
   - This is a fresh start — no backward compatibility with old localStorage data

**Branch**: `squad-branch/wave-2-state` → PR into `squad-branch`

**Exit tests**:
- Store actions produce correct state transitions (unit tests)
- `JSON.parse(JSON.stringify(appData))` round-trips cleanly with type safety
- Storage read/write works with clean typed data
- 20+ unit tests for store actions and storage service

---

### Wave 3: Utilities & Validation (Days 4-6)

**Owner: Karim (tests), Rami (utils), Nadia (validation)**

1. **Rami** migrates all utility functions to `src/utils/`:
   - `dom.ts`: `escapeHtml()`
   - `date.ts`: `convertDateFormat()`, `parseICSDate()`, `getCurrentWeekRange()`, `isDateInCurrentWeek()`, `getDayOfWeekFromDate()`
   - `color.ts`: `extractHueFromColor()`, `getNextAvailableHue()`, `generateCourseColor()`
   - `string.ts`: `truncate()`, `generateId()`
   - `semester.ts`: `compareSemesters()`, `extractYear()`, `getSeasonValue()`
   - `video.ts`: `detectVideoPlatform()`, `getVideoEmbedInfo()`, `supportsInlinePreview()`
   - `error-handling.ts`: `extractErrorCode()`, `getUserFriendlyError()`, `isRetryableError()`, `calculateBackoffDelay()`, `withRetry()`, `safeExecute()`
   - `ics-parser.ts`: `parseICS()` — extracted from `import-export.js`
2. **Nadia** migrates `validation.js` to `src/utils/validation.ts`:
   - All validators return `ValidationResult<T>` typed results
   - `validateString()`, `validateCourseName()`, `validateHomeworkTitle()`, `validateProfileName()`, `validateNotes()`, `validateUrl()`, `validateVideoUrl()`, `validateNumber()`, `validateDate()`, `validateTime()`, `validateImportedData()`
   - All regex patterns as typed constants
3. **Karim** writes comprehensive unit tests:
   - Migrate existing `utils.test.js` and `validation.test.js` to TypeScript
   - Add tests for every new utility function
   - Add edge case tests (null, undefined, empty string, boundary values)
   - Target: 95%+ coverage for `src/utils/`

**Branch**: `squad-branch/wave-3-utils` → PR into `squad-branch`

**Exit tests**:
- All existing tests pass (migrated from Jest to Vitest)
- 60+ new unit tests for utilities
- 95%+ line coverage on `src/utils/`
- Zero `any` types in utility code

---

### Wave 4: Services — Firebase & External APIs (Days 5-8)

**Owner: Hana (Firebase), Rami (external), Jad (security review)**

1. **Hana** migrates Firebase from compat CDN to modular SDK:
   - `src/services/firebase-auth.ts`: Google Sign-In with `signInWithPopup`, auth state listener, sign-out
   - `src/services/firebase-sync.ts`:
     - `buildLocalPayload()`, `mergeLocalAndCloud()` — fully typed, using clean types (no legacy normalization)
     - Client ID deduplication
     - Debounced auto-sync
     - Realtime listener with echo prevention
     - Conflict detection and resolution
   - Firebase config loaded from environment variables (`import.meta.env.VITE_FIREBASE_*`)
   - Create `.env.example` with placeholder Firebase config
2. **Rami** migrates external API services:
   - `src/services/cors-proxy.ts`: CORS proxy fetch with retry, backoff, timeout — types for `FetchConfig`, `ProxyResult`
   - `src/services/youtube.ts`: YouTube playlist HTML parsing, video extraction
   - `src/services/panopto.ts`: Panopto data parsing from clipboard JSON
   - `src/services/cheesefork.ts`: ICS URL fetching, JSON/ICS parse fallback, batch import
   - `src/services/technion-catalog.ts`: SAP course metadata fetching and course enrichment
3. **Jad** security reviews:
   - Firebase rules remain enforced (`$uid === auth.uid`)
   - CORS proxy URLs are not user-injectable
   - All HTML output uses `escapeHtml()` or Preact's built-in JSX escaping
   - No `dangerouslySetInnerHTML` without sanitization
   - URL validation before iframe embedding

**Branch**: `squad-branch/wave-4-services` → PR into `squad-branch`

**Exit tests**:
- Firebase auth flow works with mock Firebase
- Sync payload build round-trips correctly
- CORS proxy retry logic tested with mock responses (200, 429, 500, network error)
- ICS parsing produces correct Course objects from sample ICS data
- YouTube HTML parsing extracts video IDs from sample HTML
- 30+ unit tests for services

---

### Wave 5: Core UI Components — Toast, Modals, Layout (Days 7-10)

**Owner: Sami (toast, modals), Layla (layout), Noura (UI review)**

1. **Sami** creates the toast system:
   - `src/components/toast/ToastContainer.tsx` — positioned fixed bottom-right, manages toast stack
   - `src/components/toast/Toast.tsx` — individual toast with progress bar, close button, action button
   - Toast state managed via a simple store or context (not Zustand — keep it local)
   - Preserve exact same animations, colors, and behavior
2. **Sami** creates the modal system:
   - `src/components/modals/Modal.tsx` — generic overlay with backdrop, scroll lock, keyboard dismiss (Escape)
   - `src/components/modals/ConfirmDialog.tsx` — returns Promise<boolean>
   - `src/components/modals/PromptDialog.tsx` — returns Promise<string|null>
   - `src/components/modals/AlertDialog.tsx` — returns Promise<void>
   - No inline `onclick` handlers — all events via Preact's event system
3. **Layla** creates layout components:
   - `src/components/layout/Header.tsx` — brand, theme toggle, settings button, cloud status
   - `src/components/layout/HeaderTicker.tsx` — crossfade animation, message rotation (placeholder — full ticker in Wave 9)
   - `src/components/layout/SemesterControls.tsx` — semester dropdown, add/delete buttons
   - `src/components/layout/MainLayout.tsx` — two-column flex layout, responsive collapse
4. **Layla** creates `src/App.tsx` — composes layout with placeholder content areas
5. **Noura** reviews all components against the original app for pixel-perfect fidelity

**Branch**: `squad-branch/wave-5-core-ui` → PR into `squad-branch`

**Exit tests**:
- Toast notifications appear and auto-dismiss correctly
- Modals open/close with proper scroll lock
- ConfirmDialog returns correct boolean values
- Layout matches original two-column design
- Responsive breakpoint at 768px collapses to single column
- Header shows brand, theme toggle, settings gear
- 15+ component tests with Testing Library

---

### Wave 6: Course & Calendar Components (Days 9-12)

**Owner: Layla (courses), Dina (calendar), Omar (course modal)**

1. **Layla** creates course components:
   - `src/components/courses/CourseList.tsx` — renders course cards from store
   - `src/components/courses/CourseCard.tsx` — colored border, title, metadata, progress badges, reorder buttons
   - `src/components/courses/CourseProgress.tsx` — lectures/tutorials watched, homework completed indicators
2. **Dina** creates calendar components:
   - `src/components/calendar/WeeklySchedule.tsx` — CSS Grid layout, configurable hours/days
   - `src/components/calendar/TimeGrid.tsx` — time axis labels
   - `src/components/calendar/EventChip.tsx` — positioned event with course color, name, time, location
   - `src/components/calendar/CurrentTimeLine.tsx` — red dashed line updated every minute
   - Mobile: single-day toggle, collapsible view
3. **Omar** creates the course modal:
   - `src/components/modals/CourseModal.tsx` — 3-tab modal (Recordings, Homework, Details)
   - Details tab: all form fields, schedule builder, color slider, save/delete buttons
   - Connects to store for CRUD operations
   - Add/edit mode based on `editingCourseId`
4. **Layla** creates `src/components/modals/AddSemesterModal.tsx`

**Branch**: `squad-branch/wave-6-courses-calendar` → PR into `squad-branch`

**Exit tests**:
- Course cards render with correct colors, metadata, and progress
- Clicking a course card opens the course modal
- Course CRUD (create, edit, delete) works end-to-end via store
- Calendar renders correct grid based on semester settings
- Event chips position correctly based on schedule slots
- Current time line updates position
- Reorder buttons swap courses
- 20+ component and integration tests

---

### Wave 7: Recordings & Homework Components (Days 11-14)

**Owner: Omar (recordings), Layla (homework)**

1. **Omar** creates recording components:
   - `src/components/recordings/RecordingsPanel.tsx` — tab bar with count badges, sort dropdown, add recording input
   - `src/components/recordings/RecordingsTabs.tsx` — tab switching, add/rename/delete/clear tab actions
   - `src/components/recordings/RecordingItem.tsx` — watched checkbox, video link, slides link, edit section, reorder
   - `src/components/recordings/VideoPreview.tsx` — inline iframe embed for YouTube/Panopto
   - `src/components/recordings/RecordingEditor.tsx` — edit name, video link, slides link
   - Sort logic: 6 sort options, per-tab persistence
2. **Layla** creates homework components:
   - `src/components/homework/HomeworkSidebar.tsx` — grouped by urgency (overdue, today, this week, upcoming, no date)
   - `src/components/homework/HomeworkItem.tsx` — completion toggle, title, due date, course name, urgency color
   - `src/components/homework/HomeworkEditor.tsx` — inline edit with notes, links (add/edit/remove), save/cancel
   - "Show Done" toggle
   - Click to open homework in course modal with highlight
3. **Omar** creates `src/components/modals/FetchVideosModal.tsx` — YouTube URL input, Panopto paste guide, video selection checklist

**Branch**: `squad-branch/wave-7-recordings-homework` → PR into `squad-branch`

**Exit tests**:
- Recording CRUD (add, edit, delete, toggle watched) works
- Tab management (add, rename, clear, delete custom) works
- Sort options produce correct ordering
- Video preview opens/closes correctly, only one at a time
- Homework CRUD (add, edit, delete, toggle completed) works
- Sidebar groups homework by urgency correctly
- Overdue items show red, today yellow, upcoming normal
- "Show Done" toggle hides/shows completed
- 25+ component and integration tests

---

### Wave 8: Settings, Profiles, Themes (Days 13-16)

**Owner: Sami (settings), Farid (profile store integration), Hana (cloud sync UI)**

1. **Sami** creates settings modal tabs:
   - `src/components/settings/ProfileTab.tsx` — profile selector, rename, cloud sync section, export/import, delete
   - `src/components/settings/AppearanceTab.tsx` — color theme selector, base hue slider with preview, reset colors
   - `src/components/settings/CalendarTab.tsx` — start/end hours, visible days checkboxes
   - `src/components/settings/FetchDataTab.tsx` — ICS URL input, batch toggle, Technion fetch button
   - `src/components/modals/SettingsModal.tsx` — 4-tab container
2. **Sami** migrates theme system:
   - `src/hooks/useTheme.ts` — dark/light toggle, persistence
   - `src/components/ui/` — Button, IconButton, Select, Checkbox base components
3. **Hana** integrates Firebase sync UI:
   - Google Sign-In button → `signInWithPopup`
   - Connected/disconnected status display
   - `src/components/modals/SyncConflictModal.tsx` — Use Cloud / Use Local / Merge options
4. **Farid** ensures profile store connects to Firebase sync:
   - Profile create/rename/delete triggers `forceSyncToFirebase()`
   - `switchProfile` reloads data and re-renders

**Branch**: `squad-branch/wave-8-settings-profiles` → PR into `squad-branch`

**Exit tests**:
- All 4 settings tabs render and function correctly
- Theme toggle persists across page reload
- Color theme change (Rainbow/Mono/Grayscale) updates all course colors
- Profile CRUD works (create, rename, delete, switch)
- Export downloads valid JSON
- Import creates new profile with unique name
- Firebase sign-in/sign-out UI updates correctly
- Sync conflict modal offers 3 options
- 20+ tests

---

### Wave 9: Import/Export & Header Ticker (Days 15-18)

**Owner: Rami (import/export UI), Dina (ticker)**

1. **Rami** creates import/export UI integration:
   - Wire Cheesefork ICS import to `FetchDataTab` — single + batch mode
   - Wire Technion catalog fetch to `FetchDataTab`
   - Wire YouTube playlist import to `FetchVideosModal`
   - Wire Panopto clipboard import with guide modal
   - Progress indicators during fetch
   - Error handling with toast notifications
2. **Dina** migrates the full header ticker system:
   - `src/hooks/useTickerMessages.ts` — context-aware message selection logic
   - All 100+ message templates in `src/constants/ticker-templates.ts`
   - `src/components/layout/HeaderTicker.tsx` — crossfade animation between two spans
   - Placeholder resolution (`{title}`, `{minutes}`, `{courseMaybe}`, `{start}`, `{end}`, `{count}`, `{time}`, etc.)
   - Priority system: overdue > exam > class now > class soon > hw today > general
   - Time-of-day awareness: late night, morning, weekend detection
   - Rotation interval with smooth crossfade

**Branch**: `squad-branch/wave-9-import-ticker` → PR into `squad-branch`

**Exit tests**:
- ICS import creates correct semesters and courses from sample ICS data
- Batch import creates multiple semesters
- Technion catalog enriches existing courses with metadata
- YouTube import extracts videos from sample playlist HTML
- Ticker shows contextually appropriate messages
- Crossfade animation works without flicker
- Priority ordering is correct (overdue > exam today > class now > ...)
- Late night/morning/weekend detection works at boundary times
- 15+ tests

---

### Wave 10: Event System Cleanup & Entry Point (Days 17-19)

**Owner: Farid (events), Layla (cleanup), Khalil (build)**

1. **Farid** removes all `window.*` global exports from `main.js`:
   - Every `onclick="functionName()"` in HTML replaced by Preact event handlers
   - No more global function exports — everything is module-scoped
   - All event listeners from `events.js` are now handled by component `onClick`, `onChange`, etc.
2. **Layla** performs final cleanup:
   - Remove all original `js/*.js` files (they are now in `src/`)
   - Remove old `tests/` directory (replaced by `tests/` with TypeScript)
   - Remove old `index.html` (replaced by Vite's minimal `index.html`)
   - Update `CNAME` location to `public/CNAME`
   - Ensure `favicon.svg` is in `public/`
3. **Khalil** finalizes build:
   - Verify `npm run build` produces correct output in `dist/`
   - Verify the built app works when served statically
   - Configure Vite's `base` for GitHub Pages
   - Ensure all CSS is properly bundled
   - Verify Firebase config via environment variables works in production build

**Branch**: `squad-branch/wave-10-cleanup` → PR into `squad-branch`

**Exit tests**:
- Zero `window.*` references in source code (except necessary Web APIs)
- Zero inline `onclick` handlers in any HTML/JSX
- `npm run build` produces a fully functional static site
- All features work in the built version (manual smoke test)
- No console errors in browser
- Bundle size is reasonable (target: <200KB gzipped JS)

---

### Wave 11: E2E Tests & Documentation (Days 18-21)

**Owner: Lina (E2E), Rana (docs), Yasmin (integration)**

1. **Lina** writes Playwright E2E tests:
   - `app-lifecycle.spec.ts`: Load app → verify empty state → add semester → add course → verify render
   - `course-workflow.spec.ts`: Full CRUD cycle — add, edit, delete course, verify calendar updates
   - `settings.spec.ts`: Theme toggle, color theme change, calendar settings update
   - `recording-workflow.spec.ts`: Add recording, toggle watched, sort, tab management
   - `homework-workflow.spec.ts`: Add homework, set due date, complete, verify sidebar
   - `profile-workflow.spec.ts`: Create profile, switch, rename, export, import, delete
2. **Yasmin** writes remaining integration tests:
   - Course modal save → store update → re-render cycle
   - Semester delete with courses → confirmation → cleanup
   - Profile switch → data reload → UI update
   - Theme change → color reset → all courses updated
3. **Rana** updates documentation:
   - Rewrite `DOCUMENTATION.md` architecture section for new stack
   - Update project structure section
   - Update development setup instructions (Vite dev server, env vars)
   - Document new file structure and module responsibilities
   - Add contributing guidelines

**Branch**: `squad-branch/wave-11-tests-docs` → PR into `squad-branch`

**Exit tests**:
- All E2E tests pass in CI
- All integration tests pass
- Overall test coverage ≥ 80%
- Documentation is complete and accurate
- New developer can clone → npm install → npm run dev and start working

---

### Wave 12+: Review & Hardening Loops (10+ iterations)

**Owner: Entire team, led by Amir and Zara**

After all waves are complete and merged into `squad-branch`, execute a minimum of **10 full review iterations**. Each iteration follows this cycle:

#### Iteration Structure (repeat 10+ times)

1. **Full Codebase Audit** (Zara, Malik, Jad):
   - Read every file in `src/`
   - Check for: `any` types, type assertions, missing error handling, inconsistent patterns, circular dependencies, dead code, unused imports, potential memory leaks, missing cleanup in effects
   - Check CSS: unused classes, inconsistent naming, missing dark mode variables, broken responsive breakpoints
   - Check store: unnecessary re-renders, missing memoization, stale closures
   - Log all findings as GitHub issues with labels: `bug`, `refactor`, `performance`, `security`, `style`

2. **UI Fidelity Audit** (Noura):
   - Compare every screen, modal, and interaction against the original vanilla JS app
   - Check: spacing, colors, font sizes, animations, hover states, focus states, scroll behavior, mobile layout
   - Log all visual regressions as issues

3. **Test Gap Analysis** (Yasmin, Karim, Lina):
   - Run coverage report: identify uncovered lines/branches
   - Add tests for any uncovered critical paths
   - Add edge case tests for validators and Firebase sync
   - Add error scenario tests (network failures, invalid data, storage full)

4. **Security Audit** (Jad):
   - Check all user inputs flow through validation before use
   - Verify no raw HTML injection (no `dangerouslySetInnerHTML` without sanitization)
   - Verify Firebase rules are documented and correct
   - Check CORS proxy usage for SSRF potential
   - Verify URL validation before iframe embedding

5. **Performance Audit** (Zara, Farid):
   - Check bundle size with `npx vite-bundle-visualizer`
   - Identify unnecessary re-renders with Preact DevTools
   - Check for expensive computations in render paths — add `useMemo` where needed
   - Verify lazy loading opportunities
   - Check localStorage read/write frequency

6. **Fix All Findings** (assigned developers):
   - Each finding is a GitHub issue
   - Each fix is a separate PR from `squad-branch/review-N-fix-description` into `squad-branch`
   - Required reviewers approve each fix

7. **Regression Check**:
   - After all fixes in this iteration: full CI run (lint, typecheck, test, build)
   - E2E tests pass
   - Manual smoke test of all major flows

8. **Iteration Sign-off** (Amir):
   - Amir reviews the iteration summary
   - If critical issues remain → next iteration
   - If only cosmetic/minor issues remain after iteration 10 → declare migration complete

#### Specific Review Checklist (check every iteration)

- [ ] Zero `any` types (except in test mocks)
- [ ] Zero `@ts-ignore` or `@ts-expect-error` without justification comment
- [ ] Zero `as` type assertions without justification comment
- [ ] All components have at least one test
- [ ] All store actions have unit tests
- [ ] All services have unit tests with mock dependencies
- [ ] All validators have comprehensive tests (valid, invalid, edge cases, null, undefined)
- [ ] No inline styles in JSX (use CSS classes from existing stylesheets)
- [ ] No magic numbers — all constants in `src/constants/`
- [ ] No duplicated logic — shared utilities are in `src/utils/`
- [ ] All async operations have error handling with user-facing toast messages
- [ ] All forms have validation with error messages
- [ ] All lists handle empty state with placeholder messages
- [ ] Dark mode works on every component
- [ ] Mobile responsive behavior matches original app
- [ ] Keyboard navigation works (Tab, Enter, Escape on modals)
- [ ] Screen reader accessibility (ARIA labels, live regions for toasts)
- [ ] Firebase sync works: sign in, auto-sync, conflict resolution, sign out
- [ ] Profile export/import produces valid data
- [ ] All external integrations work (Cheesefork, Technion, YouTube, Panopto)

---

## Git Workflow Rules

1. **Branch naming**: `squad-branch/wave-N-description` for wave work, `squad-branch/review-N-fix-description` for review fixes
2. **Commit messages**: Conventional Commits format — `feat(scope): description`, `fix(scope): description`, `refactor(scope): description`, `test(scope): description`, `docs(scope): description`, `chore(scope): description`
3. **PR template**: Every PR must include:
   - Wave number
   - GitHub issue reference
   - What changed (brief)
   - How to test (brief)
   - Screenshots if UI changed
   - Reviewer checklist
4. **Never push to `main`**. All work flows: sub-branch → PR → `squad-branch`. Only after full migration is validated will `squad-branch` be merged to `main`.
5. **No force pushes** on any shared branch.
6. **Squash merge** sub-branches into `squad-branch` to keep history clean.
7. **Delete sub-branches** after merge.

---

## Definition of Done for the Full Migration

1. All 18 original JS modules are replaced by typed TypeScript modules — zero `.js` files in `src/`.
2. All features from `DOCUMENTATION.md` Section 13 (Feature Summary) work identically.
3. The UI is visually indistinguishable from the original app (verified by Noura across light/dark mode, desktop/mobile).
4. Test coverage ≥ 80% overall, ≥ 95% for utilities and validators.
5. Zero TypeScript errors with `strict: true`.
6. Zero ESLint warnings.
7. `npm run build` produces a deployable static site under 200KB gzipped JS.
8. Firebase sync works end-to-end (sign in, auto-sync, conflict resolution, offline detection).
9. No legacy migration code, no compact format abbreviation code, no backward compatibility shims — clean slate.
10. All 10+ review iterations completed with findings resolved.
11. `DOCUMENTATION.md` is updated to reflect the new architecture.
12. CI pipeline is green and enforces all quality gates.
13. E2E tests cover all critical user flows.
14. The `squad-branch` is ready to merge to `main`.

---

## Do not stop after the first wave. Complete all 12+ waves and all 10+ review iterations. This is a full migration program, not a prototype.
