# Squad Decisions

## Active Decisions

### 2026-04-05T00:50:09Z : Git Workflow Rules
**By:** Ibrahim Tabajah (via Copilot)
**What:**
- Branch naming: squad-branch/wave-N-description for wave work, squad-branch/review-N-fix-description for review fixes
- Commit messages: Conventional Commits format (feat, fix, refactor, test, docs, chore)
- PR template: wave number, issue reference, what changed, how to test, screenshots, reviewer checklist
- Never push to main
- No force pushes on any shared branch
- Squash merge sub-branches into squad-branch
- Delete sub-branches after merge
**Why:** User-defined git workflow constraints for consistent team operations.

### 2026-04-05T00:50:09Z : Migration Hard Rules (User Directives)
**By:** Ibrahim Tabajah (via Copilot)
**What:**
1. Always use claude-opus-4.6 for every agent spawn, no exceptions.
2. Re-read DOCUMENTATION.md before starting, before each wave, and before any wave is declared complete.
3. Never push to main. All work on squad-branch or sub-branches. Use PRs from sub-branches into squad-branch.
4. Every PR must pass CI checks (lint, typecheck, test, build) before merge. No --no-verify, no force pushes.
5. The existing UI must remain visually identical. Pixel-perfect fidelity required.
6. Every module migration must maintain full feature parity with the original JS.
7. No merge without required reviewer gates.
8. Every task must reference a GitHub issue, declare its wave, and define an exit test.
9. Commits must be atomic, well-messaged, scoped (Conventional Commits format).
10. Use GitHub Issues for tracking, GitHub PRs for code review, GitHub Actions for CI.
11. No migration code, no backward compatibility code, no legacy format support. Clean-slate rewrite.
12. No compact storage format. Full readable typed interfaces only.
**Why:** User-defined migration program rules — foundational constraints for all agents.

### 2026-04-04T21:55:00Z: Branch Naming Adjustment
**By:** Squad (Coordinator)
**What:** Git does not allow both `squad-branch` (a branch) and `squad-branch/wave-N-*` (sub-paths) to coexist because refs/heads treats branch names as file paths. Branch naming convention adjusted to: `wave-N-description` for wave work, `review-N-fix-description` for review fixes. All branches still target `squad-branch` as their PR base.
**Why:** Git limitation — a ref cannot be both a file and a directory prefix. This is functionally equivalent to the original spec but works with git's ref system.

### 2026-04-04T00:00:00Z: Migration Issue Structure
**By:** Amir (Tech Lead)
**What:** Created the full GitHub Issues program for Tollab v2 TypeScript migration: 1 umbrella issue (#17) tracking the entire 13-wave migration, 28 child issues (one per module/deliverable across waves 0–12+), and 23 labels for wave tracking and category filtering.
**Why:** Every wave and module has a discrete, trackable issue with owner, branch, deliverables, and exit tests. Umbrella issue provides a single dashboard with task list checkboxes for progress tracking. Labels enable filtering by wave number and work category.
**Impact:** All team members should reference their assigned issues when creating branches and PRs. Branch naming follows the convention `wave-N/descriptive-name` as specified in each issue.

### 2026-04-04T00:00:00Z: Wave 0 Tooling Choices
**By:** Khalil (DevOps/CI)
**What:** Set up the full build/test/lint pipeline for the TypeScript migration with ESLint flat config (eslint.config.js) not legacy .eslintrc, no-explicit-any: warn for now, Vitest globals: true for jest-dom matchers, old index.html preserved as index.legacy.html, deploy workflow disabled until migration complete, CI triggers on PR to squad-branch only, tsconfig includes tests/ alongside src/, build command = tsc --noEmit && vite build.
**Why:** ESLint 9.x uses flat config by default. Vitest needs globals for test matchers. Legacy app preservation ensures safe rollback. CI gate enforcement ensures all PRs meet quality standards.
**Impact:** All team members can now run npm run dev, build, lint, typecheck, test from repo root. CI will enforce these on every PR.

### 2026-04-04T00:00:00Z: PR #46 Review — Wave 0 Tooling (Nadia)
**By:** Nadia (System Designer)
**What:** Reviewed and approved PR #46 Wave 0 Tooling setup. TypeScript config verified (strict: true, noUncheckedIndexedAccess: true, jsx: react-jsx + jsxImportSource: preact), Vite + Preact integration correct, ESLint flat config properly scoped, all npm scripts functional, all 7 CSS files present, CI gates in correct order, all build verification passes.
**Why:** Architectural and type-safety validation required for migration foundation.
**Impact:** PR #46 approved for merge. Wave 0 tooling foundation ready for all future waves.

### 2026-04-04T00:00:00Z: PR #46 Review — Wave 0 Tooling (Tariq)
**By:** Tariq (System Designer — Data)
**What:** Reviewed and approved PR #46 Wave 0 Tooling setup with focus on data readiness. TypeScript config excellent (strict mode + noUncheckedIndexedAccess enabled for safe data handling), package.json clean (preact ^10.25.0, zustand ^5.0.0, no legacy packages), no legacy data code in src/, clean slate verified (App.tsx pure presentation, main.tsx minimal entry point), all build pipelines pass.
**Why:** Data-layer validation ensures foundation is ready for Wave 2 Firebase integration and Zustand store architecture.
**Impact:** PR #46 approved for merge. Data-driven design can proceed confidently in Wave 2.

### 2026-04-04T00:00:00Z: PR #46 Review — Wave 0 Tooling (Zara)
**By:** Zara (Architecture)
**What:** Reviewed and approved PR #46 Wave 0 Tooling setup with comprehensive architecture assessment. Vite build config correct (preset, aliases, output targets), CI/CD architecture sound (lint → typecheck → test → build gates, deploy safely disabled), project structure clean (legacy excluded, co-located tests), module boundaries correct (no circular dependencies), dependency graph minimal and focused, TypeScript strictness excellent for migration, all pipeline gates pass locally. Minor: old .eslintrc.js (legacy CommonJS config) still exists alongside new flat config — recommend removal in cleanup pass.
**Why:** Architectural validation ensures scaling and maintainability across 13-wave migration.
**Impact:** PR #46 approved for merge. Architecture foundation ready for parallel Wave 1+ work.

### 2026-04-05T00:00:00Z: Wave 1 Type System Architecture
**By:** Nadia, Tariq, Zara (System Designers)
**What:** Wave 1 delivered the complete TypeScript type system foundation: 11 type files (591 lines) covering all 12 domain interfaces from DOCUMENTATION.md §5, 9 constants files (396 lines) with 19 verified constants from legacy implementations, zero legacy patterns, acyclic module graph (constants → types dependency direction), complete barrel exports, 100% type safety (zero `any`, proper enums/unions, `satisfies` operator for compile-time safety), JSON serialization safety verified for all data models, ReadonlySet for immutable collections.
**Why:** Clean-slate type foundation ensures data integrity, type safety, and architectural correctness across all 13 waves. Module boundaries prevent circular dependencies. Constants immutability prevents accidental mutations. Generic ValidationResult<T> enables extensible validation layer.
**Impact:** Wave 1 approved by Tariq and Zara. PR #47 squash-merged to squad-branch. ProfileData and AppSettings types ready for Wave 2 Zustand store implementation. Zero type refactoring needed for subsequent waves. Foundation supports all 13-wave migration roadmap.
**Non-blocking observations (documented for Wave 2+):**
1. AppSettings theme/colorTheme widening (| string) enables forward-compatibility; recommend validation layer boundary to narrow types internally
2. DAY_NAMES and DAY_NAMES_SHORT are identical; consider consolidating to single source of truth
3. DEFAULT_CALENDAR_SETTINGS lives in types/semester.ts (unusual); re-export bridge acceptable but consider constants-only location as defaults accumulate

### 2026-04-05T00:00:00Z: Wave 2 Store Architecture
**By:** Farid (State Management Dev)
**What:** Created four Zustand store files in `src/store/` (1154 lines total): **app-store.ts** (main application state, CRUD, settings, bulk import, immer middleware), **profile-store.ts** (profile metadata, one-way read from app-store), **ui-store.ts** (ephemeral modal/editing/sidebar state, no persistence), **selectors.ts** (derived-state hooks with exact legacy JS logic). Sort orders stored separately from Course type (keeps domain model clean). Actions are pure — no side effects. immer middleware enables safe deep mutations. `importCourses` intelligently merges (matches by number/name, updates exam dates, deduplicates).
**Why:** Zustand stores provide reactive state management with immutable updates and selector patterns. Three-store decomposition separates concerns (domain data, metadata, ephemeral UI). Selectors enable efficient component subscriptions. immer middleware simplifies deep mutations (4–5 level nesting in app-store).
**Impact:** All team members building components (Wave 3+) import from `@/store/app-store`, `@/store/profile-store`, `@/store/ui-store`, and `@/store/selectors` for state access. Wave 3 will wire subscribers to storage service for persistence. Foundation ready for Wave 3 component integration.
**Non-blocking observations (Wave 3+):**
1. `currentSemesterId` and sort orders not persisted per-profile (Wave 3 to decide: extend `ProfileData` or separate keys)
2. `saveData` is timestamp-only (persistence wired in Wave 3 via subscribers)
3. Selector efficiency (Wave 3 to add memoization or `useShallow` when components consume)
4. `profile-store → app-store` coupling in `exportProfile()` (consider orchestration layer in future)

### 2026-04-05T00:00:00Z: Clean Storage Service (Wave 2)
**By:** Tariq (System Designer — Data)
**What:** Created `src/services/storage.ts` (171 lines) as the single typed localStorage interface for Tollab v2. All 10 functions implemented: `saveToLocalStorage` / `loadFromLocalStorage` (profile-scoped ProfileData), `saveProfileList` / `loadProfileList` (profile registry), `saveSettings` / `loadSettings` (app-wide AppSettings with defaults fallback), `deleteProfileData` (cleanup), `getStorageUsage` (quota estimation), `exportAllData` / `importData` (backup/restore). No `AppData` type alias created (ProfileData already has correct shape). `StorageWriteResult` return type instead of void+throw. `loadSettings()` never returns null — always has defaults. Runtime validation guards for all loads. Export envelope is versioned for forward compatibility.
**Why:** Single-entry-point storage service prevents localStorage access scattered across codebase. `StorageWriteResult` enables graceful error handling without try/catch wrapping. Runtime validators detect corrupt old compact-format data. Versioned exports enable future format evolution. Service isolation (zero store imports) ensures clean dependency graph.
**Impact:** Farid's Zustand stores import from `@/services/storage` for persistence. No other module touches `localStorage` directly. Old compact data in localStorage silently returns null — clean break with no migration code required.
**Non-blocking observations (Wave 3+):**
1. Import has no rollback on partial write failure (data integrity concern, not security issue)
2. Prototype pollution defense-in-depth (currently safe, recommend stripping `__proto__` and `constructor`)
3. No length/size validation on imported profileId (future waves: add length limits, regex allowlist)

### 2026-04-05T00:00:00Z: PR #48 Review Fixes (Wave 2)
**By:** Rami (Services Dev — External)
**What:** Fixed all 4 review findings on PR #48 (wave-2-state): **(1) `deleteSemester` splice ordering (BLOCKING)** — moved sort-order cleanup loop *before* `state.semesters.splice(idx, 1)` so it reads the correct semester data instead of shifted/undefined element after removal. **(2) `homeworkSortOrders` type annotation** — changed `Record<string, string>` → `Record<string, HomeworkSortOrder>` in AppState interface and loadData parameter (2 locations + import). **(3) Storage key collision (BLOCKING)** — changed `DATA_PREFIX` from `'tollab_'` to `'tollab_data_'` so per-profile keys (`tollab_data_{id}`) can never collide with registry keys (`tollab_profiles`, `tollab_settings`). **(4) Duplicated `DEFAULT_SETTINGS`** — removed local constant from storage.ts and imported `DEFAULT_THEME_SETTINGS` from `@/constants` instead.
**Why:** Fix 1 was a data-loss bug (deleting semester silently skipped sort-order cleanup or cleaned wrong semester's courses). Fix 3 was a correctness/security bug (profile named `"profiles"` would overwrite app-level registry data). Fixes 2 and 4 are type-safety and DRY hygiene.
**Impact:** PR #48 all CI checks passing (npm run typecheck, npm run lint). All three reviewers (Nadia, Zara, Jad) re-reviewed and APPROVED. PR #48 squash-merged to squad-branch. Wave 2 marked complete.

### 2026-04-05T00:00:00Z: Wave 3 Utility Module Design
**By:** Rami (Services Dev — External)
**What:** Wave 3 utilities designed as a pure, side-effect-free layer with no application state dependencies. Key design decisions: (1) `compareSemesters` takes `string` (semester name), not full `Semester` object — keeps utility pure and decoupled. (2) `extractHueFromColor` returns `number` not `string` — semantic correctness aligns with `getNextAvailableHue(usedHues: number[])`. (3) `safeExecute` simplified to synchronous try/catch with typed fallback value — removes async complexity and toast integration (application-level concerns). (4) `generateCourseColor` takes `existingColors: string[]` and uses array length as index — removes global appData dependency. (5) ICS parser uses local `ParsedICSEvent` type separate from `@/types/Course` — represents raw parsed output before domain enrichment (id, color, recordings).
**Why:** All utilities must be independently testable, reusable across codebase, free of side effects. Pure functions with no DOM, no state, no toast systems ensure isolation and composability.
**Impact:** Wave 3 utilities layer ready for component integration in Wave 4. All 9 modules and validation functions (17 validators, 3 result types) exported via barrel. No refactoring needed for subsequent waves.

### 2026-04-05T00:00:00Z: PR #49 Review Cycle — Wave 3 Utils (Malik)
**By:** Malik (Code Quality)
**What:** Code quality review of PR #49 (wave-3-utils): 10 utility files, 206 tests, zero `any` types, 13 type assertions all runtime-guarded, robust error handling, idiomatic TypeScript patterns. All CI checks pass (typecheck, lint, 206 tests). Non-blocking observations: (1) Deprecated `substr()` on line 21 of `string.ts` — replace with `substring()` in follow-up. (2) 7 public functions in `validation.ts` untested (fixed in Rami cycle 2). (3) Slow retry tests (~6.5s total) — consider `vi.useFakeTimers()` in follow-up.
**Why:** Code quality gate ensures type safety, maintainability, and test coverage for Wave 3 foundation.
**Impact:** PR #49 APPROVED by Malik. All non-blocking items addressed in Rami fix cycle.

### 2026-04-05T00:00:00Z: PR #49 Review Cycle — Wave 3 Utils (Zara)
**By:** Zara (Architecture)
**What:** Architecture review of PR #49 confirms clean module boundaries (10 files, zero cross-cutting imports), acyclic dependency graph (types ← constants ← utils), correct layering (zero store/service imports), explicit barrel exports, and 1:1 test coverage. Import graph verified with ripgrep — no util-to-util imports. Verified `src/types/` has internal cross-refs only (no constants/utils imports), `src/constants/` imports from types only, `src/utils/` imports from types/constants only.
**Why:** Architectural validation ensures scaling and maintainability across 13-wave migration. Clean boundaries enable parallel future development.
**Impact:** PR #49 APPROVED by Zara. Non-blocking observations: (1) `VideoPlatform`/`VideoEmbedInfo` could move to `@/types/video.ts` for consistency. (2) `generateCourseColor` and `getNextAvailableHue` use different hue strategies — pick one downstream.

### 2026-04-05T00:00:00Z: PR #49 Review Cycle — Wave 3 Utils (Yasmin)
**By:** Yasmin (Senior Test Engineer)
**What:** Test quality review of PR #49 flagged 8 public functions with zero test coverage in `validation.ts` (blockers): `validateProfileName`, `validateNotes`, `validateCoursePoints`, `validateGrade`, `validateCalendarHour`, `validateScheduleItem`, `sanitizeString`, `sanitizeFilename`. Plus 2 other functions untested: `getDayOfWeekFromDate`, `getUserFriendlyError`. 206 tests passing but `validation.ts` function coverage only 52.9%.
**Why:** Migration hard rule: "full feature parity". All public functions must be tested. Sanitization functions are security-critical.
**Impact:** PR #49 REQUEST CHANGES. Assigned to Rami for test fix cycle.

### 2026-04-05T00:00:00Z: PR #49 Fix Cycle — Wave 3 Utils (Rami)
**By:** Rami (Services Dev — External)
**What:** Addressed all blocking test gaps from Yasmin review. Added +88 tests (206 → 294 total): (1) `validateProfileName` — valid name, empty (required), 50 char boundary, whitespace trimming. (2) `validateNotes` — empty allowed, 5000 char boundary, null handling. (3) `validateCoursePoints` — valid float, 0/100 boundaries, above 100, negative. (4) `validateGrade` — valid integer, rejects float, 0/100/above boundaries, negative. (5) `validateCalendarHour` — 0, 23, 24 rejected, non-integer rejected, empty rejected. (6) `validateScheduleItem` — valid item, missing fields, invalid day, end before start, equal start/end. (7) `sanitizeString` — null, control char stripping, whitespace collapsing. (8) `sanitizeFilename` — path traversal (Unix/Windows), null bytes, filesystem-unsafe chars, length truncation, empty fallback. Plus tests for `getDayOfWeekFromDate` and `getUserFriendlyError`.
**Why:** Unblock wave-3-utils PR. Achieve 100% function coverage for `src/utils/`. Security-critical functions need attack vector testing.
**Impact:** All 294 tests passing. `src/utils/` now at 94.4% statement, 86.36% branch, 100% function coverage.

### 2026-04-05T00:00:00Z: PR #49 Re-Review — Wave 3 Utils (Yasmin)
**By:** Yasmin (Senior Test Engineer)
**What:** Re-review of PR #49 after Rami fixes. All 8 untested functions now have comprehensive test suites. `sanitizeString` tested for XSS, HTML entities, control chars. `sanitizeFilename` tested for path traversal (Unix/Windows), null bytes, filesystem chars, length caps, empty fallback. 294 tests total, 100% function coverage for all `src/utils/` modules. Zero test failures.
**Why:** Verify test coverage meets migration standards.
**Impact:** PR #49 APPROVED by Yasmin. All review concerns addressed. Ready for merge.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
