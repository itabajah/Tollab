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
