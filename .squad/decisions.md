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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
