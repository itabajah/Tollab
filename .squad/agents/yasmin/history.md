# Yasmin — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- validation.ts has 17 public functions; always check barrel exports against test imports to catch untested functions early.
- withRetry tests using real setTimeout delays take ~6s total; recommend vi.useFakeTimers + vi.advanceTimersByTimeAsync for future retry-related tests.
- Coverage tool reports 0% for barrel re-export files (index.ts) — ignore these in coverage analysis.

## Work Log

### 2026-04-05: PR #49 Test Quality Review — Wave 3 Unit Tests
**Verdict:** REQUEST CHANGES
**What:** Reviewed all 9 test files (206 tests) across `tests/unit/utils/` and `tests/unit/validation/`. All tests pass. Ran `npm test` and `npm run test:coverage`.
**Findings:**
- **3 blocking issues:** (1) 8 public functions in `validation.ts` completely untested — `validateProfileName`, `validateNotes`, `validateCoursePoints`, `validateGrade`, `validateCalendarHour`, `validateScheduleItem`, `sanitizeString`, `sanitizeFilename` — dropping function coverage to 52.94%. (2) `getDayOfWeekFromDate` (date.ts) not tested. (3) `getUserFriendlyError` (error-handling.ts) not tested.
- **Strengths:** Excellent test structure/naming, good edge-case coverage for tested functions, proper test isolation with fake timers, assertions test behavior not implementation.
- **Non-blocking:** ICS parser partial-match branch untested, withRetry tests slow due to real delays.
**Action:** Review written to `.squad/decisions/inbox/yasmin-wave3-review.md`. ~45–55 new tests needed to close gaps.

### 2026-04-05: Wave 11 — Integration Tests for Store→UI Data Flow
**What:** Created 6 integration test files (68 new tests) covering all CRUD flows across the Zustand stores and storage service.
**Files created:**
- `tests/integration/course-crud.test.tsx` — 9 tests: add/update/delete/move course, sort order cleanup, reorder
- `tests/integration/semester-management.test.tsx` — 9 tests: add/delete/switch/rename semester, calendar settings, cascade delete
- `tests/integration/recording-management.test.tsx` — 10 tests: recording item CRUD, toggle watched, tab CRUD, sort orders, clear tab
- `tests/integration/homework-management.test.tsx` — 7 tests: homework CRUD, toggle completed, reorder, sort orders, urgency grouping
- `tests/integration/profile-management.test.tsx` — 14 tests: profile CRUD, switch, export/import, name dedup, raw format import
- `tests/integration/import-export.test.tsx` — 19 tests: storage save/load round-trip, export JSON shape, import validation, full round-trip
**Config:** Updated `vite.config.ts` include pattern to pick up `tests/integration/**`.
**Results:** All 362 tests pass (294 existing + 68 new). Typecheck clean. Committed and pushed to `wave-11-tests-docs`.
**Learnings:** Zustand stores can be tested purely via `getState()`/`setState()` without rendering — fast and reliable for action→selector integration tests.
