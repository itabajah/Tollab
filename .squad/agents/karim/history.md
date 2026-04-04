# Karim — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- Vitest config in `vite.config.ts` needed `tests/unit/**/*.{test,spec}.{ts,tsx}` added to `include` array for test discovery outside `src/`
- `truncate()` in `src/utils/string.ts` uses `substring(0, maxLength - 1) + '\u2026'` — the ellipsis is one character, so effective visible length is `maxLength`
- `extractHueFromColor` and `extractYear` do NOT handle null input (they throw) — the TS type says `string` so null is an unsafe cast edge case
- `new Date('2023-02-29T00:00:00')` returns NaN in jsdom (unlike many browsers that roll to March 1)
- `isRetryableError` takes the raw error object, not a code string — it calls `extractErrorCode` internally
- `safeExecute<T>(fn, fallback)` requires both args — fallback is not optional
- `validateNumber` takes `(value, options)`, `validateDate` takes `(value, fieldName?)`, `validateTime` takes `(value, fieldName?)`
- The `withRetry` tests take ~5-6s due to real exponential backoff delays (no fake timers used for async retries)
- `parseICS` returns `ParsedICSEvent[]` with fields: name, number, lecturer, location, schedule, moedA, moedB — NOT raw VEVENT fields
- `compareSemesters(a, b)` takes raw semester name strings (not objects)

## Work Log

### Wave 3 — Unit Tests (2026-04-05)

**Branch:** `wave-3-utils`
**Commit:** `a016644` — `test(utils): add 206 unit tests for utilities and validation`

**What was done:**
- Created 9 test files in `tests/unit/` (8 utility + 1 validation)
- 206 total test cases — exceeds the 60+ target by 3.4x
- Updated `vite.config.ts` to include `tests/unit/` in Vitest test discovery
- All 206 tests pass, typecheck clean

**Test files created:**
1. `tests/unit/utils/dom.test.ts` — 11 tests (escapeHtml: entities, null, empty, mixed)
2. `tests/unit/utils/date.test.ts` — 19 tests (convertDateFormat, parseICSDate, getCurrentWeekRange, isDateInCurrentWeek)
3. `tests/unit/utils/color.test.ts` — 16 tests (extractHueFromColor, getNextAvailableHue, generateCourseColor)
4. `tests/unit/utils/string.test.ts` — 12 tests (truncate edge cases, generateId uniqueness)
5. `tests/unit/utils/semester.test.ts` — 19 tests (compareSemesters, getSeasonValue, extractYear, Hebrew support)
6. `tests/unit/utils/video.test.ts` — 19 tests (detectVideoPlatform, getVideoEmbedInfo, supportsInlinePreview)
7. `tests/unit/utils/error-handling.test.ts` — 27 tests (extractErrorCode, isRetryableError, calculateBackoffDelay, withRetry, safeExecute)
8. `tests/unit/utils/ics-parser.test.ts` — 11 tests (parseICS with real ICS data, exam dates, empty/malformed)
9. `tests/unit/validation/validation.test.ts` — 71 tests (all validators: string, courseName, homeworkTitle, url, videoUrl, number, date, time, importedData)

**Coverage results (src/utils/):**
| Module | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| color.ts | 100% | 100% | 100% | 100% |
| date.ts | 92.1% | 100% | 80% | 92.1% |
| dom.ts | 100% | 80% | 100% | 100% |
| error-handling.ts | 96.5% | 84.6% | 85.7% | 96.5% |
| ics-parser.ts | 93.6% | 73.9% | 100% | 93.6% |
| semester.ts | 100% | 100% | 100% | 100% |
| string.ts | 100% | 100% | 100% | 100% |
| validation.ts | 67.5% | 85.2% | 52.9% | 67.5% |
| video.ts | 100% | 100% | 100% | 100% |

**Notes:**
- validation.ts coverage is 67.5% because sanitizeString, sanitizeFilename, validateScheduleItem, validateProfileName, validateNotes, validateCoursePoints, validateGrade, validateCalendarHour are not yet exercised — those are lower-priority convenience wrappers
- 7 of 9 utility modules at 92%+ coverage; 5 at 100%
- Rami and Nadia pushed source files before I started, so tests were written against actual APIs
