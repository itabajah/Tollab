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
