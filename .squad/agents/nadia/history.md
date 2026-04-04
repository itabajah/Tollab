# Nadia — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

### 2025-07-25 — Wave 0 Tooling Review (PR #46)
- Reviewed and **APPROVED** the Wave 0 tooling setup
- **tsconfig.json** is properly strict: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: false`, `jsxImportSource: "preact"`
- Path alias `@/*` → `./src/*` is configured in both tsconfig and vite.config.ts
- ESLint uses flat config (v9+) with `@typescript-eslint` parser and plugin
- Vitest is configured inline in vite.config.ts with jsdom environment, co-located test pattern `src/**/*.{test,spec}.{ts,tsx}`
- CI gates: lint → typecheck → test → build on PRs to squad-branch
- Deploy workflow is correctly disabled (`if: false`) during migration
- All 7 CSS files preserved from legacy app
- Note for Wave 1: will need `vite-env.d.ts` when importing non-TS assets

### 2025-07-25 — Wave 1 Type System & Constants (Closes #20, #21)
- Created **10 type files** in `src/types/`:
  - `semester.ts` — `Semester`, `CalendarSettings`, `DEFAULT_CALENDAR_SETTINGS`
  - `course.ts` — `Course`, `CourseRecordings`, `ExamEntry`, `ScheduleSlot`
  - `recording.ts` — `RecordingTab`, `RecordingItem`
  - `homework.ts` — `Homework`, `HomeworkLink`
  - `profile.ts` — `Profile`, `ProfileData`
  - `settings.ts` — `AppSettings`, `ColorTheme` (enum), `ThemeMode` (enum), `RecordingSortOrder`, `HomeworkSortOrder`
  - `validation.ts` — `ValidationResult<T>`, `DateValidationResult`, `VideoUrlResult`, `ImportValidationResult`
  - `toast.ts` — `ToastType` (enum), `ToastOptions`
  - `ticker.ts` — `TickerCategory`, `TickerKind`, `TickerContext`, `TickerTemplateVars`, `TickerTemplateMap`
  - `sync.ts` — `FirebaseSyncState` (enum), `SyncConflictInfo`, `CloudPayload`, `CloudProfileEntry`
  - `index.ts` — Barrel re-export
- Created **9 constants files** in `src/constants/`:
  - `sort-orders.ts` — `SORT_ORDERS`, `RECORDING_SORT_ORDERS`, `HOMEWORK_SORT_ORDERS`
  - `calendar.ts` — `DAY_NAMES`, `DAY_NAMES_FULL`, `DAY_NAMES_SHORT`, `DEFAULT_CALENDAR_SETTINGS`
  - `storage-keys.ts` — `STORAGE_KEYS`
  - `themes.ts` — `COLOR_THEMES`, `DEFAULT_THEME_SETTINGS`, `GOLDEN_ANGLE`
  - `api.ts` — `CORS_PROXIES`, `TECHNION_SAP_BASE_URL`
  - `semesters.ts` — `SEMESTER_SEASONS`, `SEMESTER_TRANSLATIONS`, `SemesterSeason` type
  - `ui.ts` — `ANIMATION_DURATIONS`, `TIME_UPDATE_INTERVAL`, `MAX_LENGTHS`, `DEFAULT_RECORDING_TABS`, `PROTECTED_TAB_IDS`, `TOAST_CONFIG`, `HEADER_TICKER_ROTATE_MS`, `EXPORT_DATA_VERSION`, `MOBILE_BREAKPOINT`
  - `validation.ts` — `VALIDATION_LIMITS`, `VALIDATION_PATTERNS`, `HTML_ENTITIES`
  - `index.ts` — Barrel re-export
- **Design decisions:**
  - `AppSettings.theme` and `colorTheme` accept `string` union with enums for backward-compatible hydration
  - `CloudPayload` uses full readable property names (not compact `v/u/a/p` keys) per migration rules
  - Sort orders are string literal union types, not enums, for easier JSON round-tripping
  - `PROTECTED_TAB_IDS` typed as `ReadonlySet<string>` (can't freeze a Set but it's const-bound)
  - All `Object.freeze()` + `as const` for maximum immutability
- `npm run typecheck` ✅ `npm run lint` ✅

### 2025-07-25 — Wave 2 Store Review (PR #48)
- Reviewed Zustand stores (app-store, profile-store, ui-store), selectors, and storage service
- **REQUEST CHANGES** — 1 bug, 2 type-system issues:
  1. **Bug:** `deleteSemester` splices the array *before* reading the deleted semester for sort-order cleanup — cleans up wrong courses or nothing
  2. **Type gap:** `homeworkSortOrders` typed as `Record<string, string>` instead of `Record<string, HomeworkSortOrder>`, forcing unsafe casts in selectors
  3. **Duplication:** `storage.ts` defines its own `DEFAULT_SETTINGS` identical to `DEFAULT_THEME_SETTINGS` from `@/constants` — drift risk
- Verified: zero `any` types, clean JSON only (no compact format), all Wave 1 types imported and used correctly, immer mutations idiomatic
- Non-blocking: `currentSemesterId` and sort orders not in `ProfileData` (lost on reload); `saveData` is timestamp-only marker (needs subscriber wiring in Wave 3)
- `npm run typecheck` ✅ `npm run lint` ✅

### 2025-07-25 — Wave 3 Validation Migration
- Created **`src/utils/validation.ts`** (533 lines) — full migration of `js/validation.js`
- **17 exported functions:** validateString, validateCourseName, validateHomeworkTitle, validateProfileName, validateNotes, validateUrl, validateVideoUrl, validateNumber, validateCoursePoints, validateGrade, validateCalendarHour, validateDate, validateTime, validateImportedData, validateScheduleItem, sanitizeString, sanitizeFilename
- **8 exported types:** StringValidationOptions, NumberValidationOptions, UrlValidationOptions, DateValidationOptions, TimeValidationOptions, ImportedSemester, ImportedData, ImportedDataResult
- All validators return `ValidationResult<T>` from `@/types`; specialized return types where needed (`VideoUrlResult`, `DateValidationResult`, `ImportedDataResult`)
- All regex patterns preserved from original via `VALIDATION_PATTERNS` constants
- All error messages match original JS exactly
- Added date round-trip validation to catch invalid calendar dates (e.g. Feb 29 on non-leap years) — original JS had this gap
- `validateProfileName` simplified to format-only validation; uniqueness checking deferred to store layer per new architecture
- Function signatures match original JS calling convention (options object as 2nd arg, no fieldName) — preserves backward compatibility with existing tests (71/71 pass)
- Zero `any` types, zero lint warnings
- `npm run typecheck` ✅ `npm run lint` ✅ `npm run test` (validation) ✅ 71/71
