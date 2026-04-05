# Malik — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- Type assertions in `validateImportedData` are all guarded by runtime `typeof`/`Array.isArray()` checks — this is the accepted narrowing pattern for `unknown` → `Record` casts.
- The team uses `as const` + `Object.freeze()` for immutable constants.
- `withRetry` tests run with real timers (~6.5s); flagged for `vi.useFakeTimers()` improvement.
- `String.prototype.substr()` (deprecated) found in `string.ts:21` — flagged for `.substring()` replacement.

## Review Log

### 2026-04-05: PR #49 — Wave 3 Utilities & Validation
**Verdict:** ✅ APPROVE
**Scope:** 10 utility files (`src/utils/`), 9 test files (`tests/unit/`), 206 tests
**CI:** typecheck ✅ | lint ✅ | test ✅ (206/206)
**Key findings:**
- Zero `any` types across all utility files
- 13 `as` casts, all runtime-guarded — no unsafe assertions
- Proper error handling with structured `ValidationResult<T>` returns
- Idiomatic TS: generics, type guards, discriminated unions, pure functions
- Non-blocking: deprecated `substr()`, 7 untested wrapper functions, slow retry tests, silent catch in ICS parser
**Decision file:** `.squad/decisions/inbox/malik-wave3-review.md`

### 2026-04-06: PR #51 — Wave 5 Core UI Components
**Verdict:** 🔴 REQUEST CHANGES
**Scope:** 17 component files + 4 barrel indexes across `src/components/` (layout, modals, toast, ui)
**CI:** typecheck ✅ | lint ✅ | build ✅
**Blocking issues:**
- B1: Missing focus trap in AlertDialog, ConfirmDialog, PromptDialog — only Modal.tsx has it; dialogs re-implement overlay/keyboard without Tab cycling (WCAG 2.1 SC 2.4.3 violation)
- B2: 6 static inline styles in Header.tsx and MainLayout.tsx — violates project rule "all styling via CSS classes"
**Non-blocking findings:**
- N1: `dangerouslySetInnerHTML` for SVG icons in Toast/AlertDialog — safe but non-idiomatic vs JSX components in Header
- N2: Dead `toastsRef` in ToastContext.tsx — assigned but never read
- N3: `aria-hidden="true"` on HeaderTicker viewport contradicts parent `aria-live="polite"`
- N4: Inconsistent `class` (layout) vs `className` (modals/toast) across sibling directories
- N5: Fragile scroll-lock cleanup using DOM query count instead of ref-counting
**Positives:** Zero `any` types, no onclick strings, proper props typing, clean toast provider pattern, good focus trap in Modal.tsx, proper timer cleanup, strong accessibility intent
**Decision file:** `.squad/decisions/inbox/malik-wave5-review.md`

### 2026-04-06: PR #52 — Wave 6 Course & Calendar Components
**Verdict:** 🔴 REQUEST CHANGES
**Scope:** 11 files across `src/components/courses/`, `src/components/calendar/`, `src/components/modals/` (CourseModal.tsx, AddSemesterModal.tsx)
**CI:** typecheck ✅ | lint ✅ | build ✅
**Blocking issues:**
- B1: CourseCard has `role="button" tabIndex={0}` but no `onKeyDown` handler — keyboard users cannot activate cards (WCAG 2.1 SC 2.1.1 violation)
- B2: Static inline `style={{ fontSize: '18px' }}` on CourseList.tsx:69 — violates project rule "all styling via CSS classes"
**Non-blocking findings:**
- N1: Missing `key` on Fragment in TimeGrid.tsx `hours.map()` — reconciliation risk
- N2: `dangerouslySetInnerHTML` for SVG tab icons in CourseModal (repeat of Wave 5 N1)
- N3: `class` vs `className` inconsistency between CourseModal and AddSemesterModal (repeat of Wave 5 N4)
- N4: Suppressed exhaustive-deps in CourseModal useEffect without explicit eslint-disable comment
- N5: Redundant semester store lookup in WeeklySchedule — courses derivable from already-fetched semester
**Positives:** Zero `any` types, clean narrow store selectors, good form validation with inline errors, empty states handled, proper cleanup/memoization, clean schedule builder logic, good ARIA on form controls
**Decision file:** `.squad/decisions/inbox/malik-wave6-review.md`
