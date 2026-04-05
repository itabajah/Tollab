# Review 1 — Code Quality Deep Scan

**Date:** 2026-04-07
**Reviewer:** Malik (Code Quality Reviewer)
**Branch:** `review-1-audit`
**Scope:** All files in `src/components/` (9 subdirectories, ~40 files) and `src/hooks/` (5 files)

## Summary

Deep scan across 12 quality criteria. **12 findings** filed as GitHub issues. No `any` types, no `@ts-ignore`/`@ts-expect-error`, no missing effect cleanup. Strong baseline quality — findings are refinements, not structural failures.

## Criteria Results

| # | Criterion | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | `any` types | ✅ Pass | Zero explicit `any` in all scanned files |
| 2 | `@ts-ignore` / `@ts-expect-error` | ✅ Pass | Zero instances found |
| 3 | `as` type assertions | ⚠️ 2 findings | 50+ repetitive `e.target as HTML*Element` (#75), unsafe `JSON.parse as` (#110) |
| 4 | No inline styles | ⚠️ 1 finding | Static inline styles in HomeworkSidebar + Header (#81); dynamic positioning styles are acceptable |
| 5 | No magic numbers | ⚠️ 2 findings | Mobile breakpoint 768 (#82), timeouts/offsets/limits (#83) |
| 6 | No duplicated logic | ⚠️ 2 findings | Event helpers needed (#75), handleKeyActivate duplicated (#98) |
| 7 | Async error handling | ⚠️ 1 finding | useFirebaseSync errors console-only, no toast (#91) |
| 8 | Form validation | ⚠️ 1 finding | Add forms silently reject empty input (#109) |
| 9 | Empty states | ✅ Pass | All lists handle empty state with placeholder messages |
| 10 | Keyboard navigation | ⚠️ 2 findings | EventChip not keyboard-accessible (#92), add forms lack Enter-key (#101) |
| 11 | ARIA labels | ⚠️ 2 findings | HomeworkEditor link buttons (#93), CourseModal tab bar (#97) |
| 12 | Effect cleanup | ✅ Pass | All useEffect with intervals/listeners return cleanup |

## Issues Filed

| # | Issue | Title | Severity |
|---|-------|-------|----------|
| 1 | #75 | Extract typed event helpers (50+ repetitive `as` assertions) | Medium |
| 2 | #81 | Static inline styles in HomeworkSidebar and Header | Low |
| 3 | #82 | Magic number 768 for mobile breakpoint | Low |
| 4 | #83 | Magic numbers in FetchVideosModal and EventChip | Low |
| 5 | #91 | useFirebaseSync errors console-only, no user toast | Medium |
| 6 | #92 | EventChip missing keyboard/ARIA (WCAG 2.1.1) | High |
| 7 | #93 | HomeworkEditor link buttons lack aria-labels | Medium |
| 8 | #97 | CourseModal tab bar lacks ARIA tablist pattern | High |
| 9 | #98 | Duplicated handleKeyActivate pattern | Low |
| 10 | #101 | Add-homework forms lack Enter-key submission | Medium |
| 11 | #109 | Add forms silently reject empty input | Medium |
| 12 | #110 | Unsafe JSON.parse type assertion | Medium |

## Positives

- **Zero `any` types** across all 45+ files — excellent TypeScript discipline
- **Zero `@ts-ignore`/`@ts-expect-error`** — no suppressed type errors
- **All effects properly cleaned up** — intervals, event listeners, Firebase subscriptions all return cleanup functions
- **Consistent empty state handling** — every list has a placeholder message
- **Strong accessibility intent** — modals have focus traps, SettingsModal has full WCAG tablist pattern, toast uses aria-live
- **Good form validation** in CourseModal (name required) and AddSemesterModal (name + length validation)
- **Clean toast integration** in FetchDataTab, FetchVideosModal — async errors shown to users with descriptive messages

## Blocking vs Non-Blocking

**Blocking (should fix before merge):**
- #92 EventChip keyboard accessibility (WCAG 2.1 SC 2.1.1)
- #97 CourseModal ARIA tab pattern (WCAG 2.1 SC 4.1.2)

**Non-blocking (track for next iteration):**
- All remaining findings (#75, #81, #82, #83, #91, #93, #98, #101, #109, #110)
