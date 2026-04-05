# Review 1 — Test Gap Analysis Summary

**Author:** Yasmin (Senior Test Engineer)
**Date:** 2026-04-06
**Branch:** `review-1-audit`

## Coverage Snapshot

| Metric | Value |
|--------|-------|
| Test files | 16 |
| Tests | 362 (all passing) |
| Statement coverage | **29.29%** |
| Branch coverage | 77.42% |
| Function coverage | 51.64% |
| Line coverage | 29.29% |

## Layer-by-Layer Coverage

| Layer | Coverage | Status |
|-------|----------|--------|
| `src/utils/` | 93–100% | ✅ Well tested |
| `src/constants/` | 99% | ✅ Well tested |
| `src/store/profile-store.ts` | 98% | ✅ Well tested |
| `src/services/storage.ts` | 91% | ⚠️ Error branches missing |
| `src/store/app-store.ts` | 76% | ⚠️ Below 80% threshold |
| `src/components/layout/` | 70–83% | ⚠️ Partial gaps |
| `src/store/ui-store.ts` | 28% | ❌ Actions untested |
| `src/store/selectors.ts` | 13% | ❌ Helpers untested |
| `src/hooks/` | 0–15% | ❌ All hooks untested |
| `src/services/` (non-storage) | 0–7% | ❌ All services untested |
| `src/components/` (non-layout) | 0–10% | ❌ Zero component tests |

## Issues Created (14 total)

### Critical Priority (4)
| # | Title | File(s) | Coverage |
|---|-------|---------|----------|
| #64 | Firebase sync service — merge/conflict resolution | `firebase-sync.ts` | 0% |
| #61 | Firebase auth — auth lifecycle | `firebase-auth.ts` | 0% |
| #63 | Store persistence — bootstrap/auto-save | `store-persistence.ts` | 0% |
| #62 | UI Store — 23 actions | `ui-store.ts` | 28% |

### High Priority (5)
| # | Title | File(s) | Coverage |
|---|-------|---------|----------|
| #69 | Selectors — helpers + hooks | `selectors.ts` | 13% |
| #71 | External data services | cheesefork, cors-proxy, panopto, technion-catalog, youtube | 1–7% |
| #70 | All hooks | 5 hooks in `src/hooks/` | 0–15% |
| #68 | Storage error branches | `storage.ts` | 91% (6 error paths) |
| #78 | App Store gaps | `app-store.ts` | 76% |

### Medium Priority (5)
| # | Title | File(s) | Coverage |
|---|-------|---------|----------|
| #79 | Modal/dialog components | 9 modals + useFocusTrap | 0–60% |
| #76 | Calendar components | 4 components | 0% |
| #77 | Recordings components | 5 components | 0–11% |
| #90 | Settings/Toast/UI primitives | 11 components | 0–24% |
| #89 | Course/Homework views | 6 components | 1.5–65% |
| #88 | Firebase config + layout edges | config + 3 layout components | 0–83% |

## Key Findings

1. **No component-level tests exist.** All 362 tests are either unit tests for utilities or integration tests for store actions. No Preact JSX rendering tests.
2. **Entire Firebase stack is blind** — auth, config, sync service, persistence, and sync hook are all 0%. The conflict resolution merge logic (`mergeLocalAndCloud`) is the highest-risk untested code.
3. **UI Store drives all dialogs** — 23 actions managing modal stack and temp form state have zero coverage.
4. **Estimated ~200+ tests needed** to reach 80% statement coverage across all non-trivial files.

## Recommended Fix Order

1. Firebase sync `mergeLocalAndCloud` (data-loss risk) → #64
2. Store persistence bootstrap (data-loss risk) → #63
3. UI Store actions (CRUD dialog correctness) → #62
4. Selectors + hooks (business logic) → #69, #70
5. External services (import correctness) → #71
6. Storage error branches (resilience) → #68
7. Component tests (visual correctness) → #76, #77, #79, #89, #90, #88

## Decision Needed

The team should decide whether to:
- **A)** Target 80% overall coverage before merging review-1 fixes (significant effort, ~200+ tests)
- **B)** Focus on Critical + High issues only (~100 tests covering data-integrity paths)
- **C)** Fix Critical issues only (~50 tests) and defer component tests to a dedicated wave

**Recommendation:** Option B — cover all Critical + High issues. Component rendering tests can be deferred since the integration tests validate data flow correctness. The Firebase sync and persistence gaps are the highest risk.
