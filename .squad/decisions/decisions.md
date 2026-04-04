# Decisions Log

---

## Wave 6: Course Management UI (2026-04-06 → 2025-07-17)

### Code Quality Review (Malik)

**Date:** 2026-04-06  
**Verdict:** 🔴 REQUEST CHANGES (2 blocking, 6 non-blocking)

**Blocking Issues:**
1. **CourseCard keyboard handler:** `role="button"` div lacking `onKeyDown` for Enter/Space activation (WCAG 2.1 SC 2.1.1)
   - **Fix:** Added `handleKeyDown` callback with `e.preventDefault()`, proper dependency array
   - **Status:** ✅ RESOLVED (re-review approved)

2. **CourseList inline style:** Static `fontSize: '18px'` violates project rule (all styling via CSS classes)
   - **Fix:** Moved to `.add-course-icon` CSS class
   - **Status:** ✅ RESOLVED (re-review approved)

**Non-Blocking Observations:**
- Missing `key` on Fragment in TimeGrid.tsx:67 (use `<Fragment key={h}>` instead of `<>`)
- `dangerouslySetInnerHTML` for tab icons in CourseModal (idiomatic: JSX SVG components)
- `class` vs `className` inconsistency (CourseModal uses `className`, AddSemesterModal uses `class`)
- Suppressed exhaustive-deps lint rule in CourseModal (add explicit eslint-disable comment)
- Redundant store lookup in WeeklySchedule (derive `courses` from `semester` instead of separate selector)
- CourseCard `borderLeftColor` inline style documented as acceptable (dynamic per-course use case)

---

### UI Fidelity Review (Noura)

**Date:** 2026-04-06  
**Verdict:** 🔴 REQUEST CHANGES (7 blocking, 1 medium, 1 low)

**Blocking Issues:**
1. **Missing CSS classes (6):**
   - `.course-info` (CourseCard faculty/lecturer container)
   - `.course-list-empty` (empty-state message)
   - `.schedule-section-actions` (mobile day-toggle button)
   - `.form-control` (custom semester input)
   - `.form-error` (validation error text)
   - `.modal-footer` (action button layout)
   - **Status:** ✅ RESOLVED (all 6 classes added to CSS files)

2. **CSS selector mismatch:** `.full-spectrum` on `#cm-color-hue` → CSS targets legacy `#course-color-hue`
   - **Fix:** Updated CSS selector to include `#cm-color-hue.full-spectrum`
   - **Status:** ✅ RESOLVED

**Medium Issues:**
1. **Color hue range:** New `max="360"` vs legacy `max="180"` (half-spectrum deliberate)
   - **Fix:** Restored `max="180"` to match legacy color palette restriction
   - **Status:** ✅ RESOLVED

2. **AddSemesterModal text discrepancies:**
   - Label: "Semester" → "Select Semester" (matches legacy)
   - Button: "Add Semester" → "Create Semester" (matches legacy)
   - Placeholder: "e.g. Winter 2024" → "e.g., Special Term 2024" (matches legacy)
   - **Status:** ✅ RESOLVED

**Low Issues:**
1. **Missing calendar collapse toggle:** `#toggle-calendar-btn` absent from WeeklySchedule
   - **Decision:** Deferred to Wave 7 (documented for future implementation)
   - **Status:** 📋 DEFERRED

---

### Re-Review: Code Quality (Malik)

**Date:** 2025-07-17  
**Verdict:** ✅ APPROVED

**Verification:**
- B1 (keyboard handler): Confirmed Enter/Space with `preventDefault()`, `tabIndex={0}`, `role="button"`, memoized via `useCallback`
- B2 (inline styles): Confirmed zero inline `style` in CourseList.tsx (all CSS classes)
- CI gates: All pass (tsc 0 errors, lint 0 errors + 22 pre-existing firebase warnings unrelated, build 425ms)
- No new issues found

---

### Re-Review: UI Fidelity (Noura)

**Date:** 2025-07-17  
**Verdict:** ✅ APPROVED

**Verification:**
- All 6 missing CSS classes present in CSS files (6/6 checkmark)
- Color picker selector mismatch resolved
- Hue range `max="180"` restored
- AddSemesterModal text all match legacy (3/3 discrepancies resolved)
- Audit: 54 unique CSS classes across 9 components; 100% definition coverage (zero gaps)
- Calendar collapse toggle documented as Wave 7 item

---

## Implementation Summary

**Commit:** PR #52 squash-merged to squad-branch  
**Components:** 9 (CourseCard, CourseList, CourseProgress, WeeklySchedule, TimeGrid, EventChip, CurrentTimeLine, CourseModal, AddSemesterModal)  
**Lines Added:** 1,570+ (JSX) + CSS classes + layout updates  
**Fix Cycles:** 1 (REQUEST CHANGES → APPROVED in ~24 hours)  
**Total Review Hours:** ~6 hours (Malik: 3, Noura: 3)

---

## Wave 7 Forward Items

- Implement calendar collapse toggle (`#toggle-calendar-btn`)
- Evaluate performance optimizations (Fragment keys, selector memoization)
- Expand unit test coverage for course reorder and schedule builder
- Connect Firebase sync to course import/export workflows

