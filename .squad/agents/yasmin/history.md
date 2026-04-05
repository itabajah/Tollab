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

### 2026-04-06: Wave 12+ Review Iteration 1 — Test Gap Analysis
**What:** Ran full coverage report (`npm run test:coverage`) and performed systematic gap analysis across all source files. All 362 tests pass across 16 test files.
**Overall Coverage:** 29.29% statements, 77.42% branches, 51.64% functions, 29.29% lines.
**Findings — 14 GitHub issues created (#61–#90):**

**Critical (4 issues):**
1. **#64** — `firebase-sync.ts` (0%): All 8 functions untested including `mergeLocalAndCloud` conflict resolution — data-loss risk.
2. **#61** — `firebase-auth.ts` (0%): All 5 auth lifecycle functions untested.
3. **#63** — `store-persistence.ts` (0%): Bootstrap + auto-save completely untested — silent data loss risk.
4. **#62** — `ui-store.ts` (28%): All 23 UI actions untested (modal stack, temp form data, toggles).

**High (5 issues):**
5. **#69** — `selectors.ts` (13%): 6 helper functions + 5 selector hooks untested.
6. **#71** — External data services (1–7%): cheesefork, cors-proxy, panopto, technion-catalog, youtube — all fetch/parse logic untested.
7. **#70** — All 5 hooks (0–15%): useFirebaseSync, useCalendarTime, useImportExport, useTheme, useTickerMessages.
8. **#68** — `storage.ts` error branches (90.9%): 6 error-handling paths not covered (quota exceeded, parse failures, import write failures).
9. **#78** — `app-store.ts` (76.3%): 3 schedule actions + import edge cases untested.

**Medium (5 issues):**
10. **#79** — Modal/dialog components (0–60%): 9 components + useFocusTrap hook, including SyncConflictModal UI.
11. **#76** — Calendar components (0%): 4 components with zero coverage.
12. **#77** — Recordings components (0–11%): 5 components with zero/near-zero coverage.
13. **#90** — Settings/Toast/UI primitives (0–24%): 11 components with zero/near-zero coverage.
14. **#89** — Course/Homework view components (1.5–65%): 6 components below threshold.
15. **#88** — Firebase config (0%) + layout edge cases (<80%): config validation + responsive layout gaps.

**Key observations:**
- No Preact/JSX component-level tests exist anywhere — all coverage comes from store/service integration tests.
- All Firebase-related code (auth, sync, config, persistence) is at 0% — the entire sync path is blind.
- utils/ is the only well-tested layer (93–100% per file).
- Estimated ~200+ new tests needed to reach 80% coverage threshold.
**Learnings:** Component test files should be created in a `tests/component/` directory to match the existing `tests/unit/` and `tests/integration/` pattern. Services that depend on Firebase SDK need mock factories.
