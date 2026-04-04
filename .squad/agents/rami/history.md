# Rami — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- **deleteSemester splice-before-read bug (2026-04-05):** When removing an element from an immer draft array with `splice()`, any subsequent index-based access to the same position reads the *shifted* element — not the removed one. Always read/process data *before* the splice.
- **Storage key prefix collisions (2026-04-05):** When keys share a common prefix (e.g. `tollab_`), profile IDs like `"profiles"` or `"settings"` can collide with registry keys. Use a distinct sub-namespace (`tollab_data_`) for per-entity data keys.
- **Don't duplicate constants (2026-04-05):** `DEFAULT_THEME_SETTINGS` already existed in `@/constants/themes.ts` — the storage service had a copy. Always check the barrel export before defining local defaults.
- **Wave 3 utils migration (2026-04-05):** Migrated all 9 utility modules to TypeScript: dom, date, color, string, semester, video, error-handling, ics-parser, plus barrel index. 823 lines across 9 files, zero `any`, typecheck + lint clean on first pass (one `noUncheckedIndexedAccess` fix in color.ts). ICS parser extracted from import-export.js with full feature parity including Hebrew exam labels, partial course-name matching, and duplicate schedule dedup.
- **noUncheckedIndexedAccess catches real bugs (2026-04-05):** With `noUncheckedIndexedAccess: true` in tsconfig, regex match array indexing like `match[1]` returns `string | undefined`. Use optional chaining (`match?.[1]`) or truthiness checks before `parseInt`. This caught a real gap in `extractHueFromColor`.
- **PR #49 review fix — test gap coverage (2026-04-05):** Yasmin flagged 10 untested public functions across validation.ts, date.ts, and error-handling.ts. Added 88 new tests (294 total, up from 206) covering all 10 functions: validateProfileName, validateNotes, validateCoursePoints, validateGrade, validateCalendarHour, validateScheduleItem, sanitizeString, sanitizeFilename, getDayOfWeekFromDate, getUserFriendlyError. validation.ts now 100% function coverage (was 52.9%), date.ts 100% (was 80%), error-handling.ts 100% (was 85.7%). All CI gates pass — typecheck, lint, 294/294 tests green. Committed to wave-3-utils and pushed.
- **Wave 4 external services migration (2026-04-05):** Migrated all external API services to TypeScript — 5 new files, 1250 lines total, zero `any`. Created: **cors-proxy.ts** (CORS proxy with exponential backoff, jitter, multi-proxy fallback, rate-limit handling, typed `ProxyFetchError` class), **youtube.ts** (playlist HTML parsing with `ytInitialData` JSON primary + regex fallback, dedup by video ID), **panopto.ts** (clipboard JSON parsing, folder HTML extraction with 4 strategies — DeliveryInfo/href/sessionId/JSON blocks, saved HTML file parsing with `<tr>` row + aria-label patterns), **cheesefork.ts** (ICS fetch via proxy with JSON-first Cheesefork optimization, ICS parsing delegation to `@/utils/ics-parser`, batch import with per-URL error isolation, Hebrew semester name translation), **technion-catalog.ts** (SAP semester list fetch, multi-semester catalog builder, course enrichment with exact/partial/name matching, immutable enrichment — returns new objects). All use `@/constants/api` for CORS_PROXIES and TECHNION_SAP_BASE_URL. Typecheck + lint clean on first pass. Committed to `wave-4-services` and pushed.
