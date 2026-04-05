# Review 1 — UI Fidelity Audit (Noura)

**Date:** 2026-04-07
**Reviewer:** Noura (UI Fidelity Reviewer)
**Branch:** `review-1-audit`
**Scope:** Full cross-component UI audit against `index.legacy.html`

## Verdict: ❌ REQUEST CHANGES

7 findings filed as GitHub issues (#102–#108). 2 medium-severity, 5 low-severity.

---

## Findings Summary

| # | Issue | Severity | Component | Description |
|---|-------|----------|-----------|-------------|
| 1 | [#102](https://github.com/itabajah/Tollab/issues/102) | **Medium** | WeeklySchedule.tsx | Missing `#toggle-calendar-btn` — calendar collapse/expand button absent |
| 2 | [#103](https://github.com/itabajah/Tollab/issues/103) | **Medium** | AddSemesterModal.tsx | Modal size mismatch: `size="sm"` (400px) vs legacy default (600px) |
| 3 | [#104](https://github.com/itabajah/Tollab/issues/104) | Low | AddSemesterModal.tsx | Extra Cancel button + `modal-footer` wrapper not in legacy |
| 4 | [#105](https://github.com/itabajah/Tollab/issues/105) | Low | HeaderTicker.tsx | Always renders even when messages empty; legacy starts `display:none` |
| 5 | [#106](https://github.com/itabajah/Tollab/issues/106) | Low | Header.tsx | CloudSyncIcon uses undefined `--green`/`--red` CSS variables |
| 6 | [#107](https://github.com/itabajah/Tollab/issues/107) | Low | CourseCard, HomeworkItem | No `:focus-visible` styles for `tabIndex={0}` elements |
| 7 | [#108](https://github.com/itabajah/Tollab/issues/108) | Low | App.tsx | ToastContainer commented out — all toast notifications invisible |

---

## Audit Methodology

Compared every component (40+ files) against `index.legacy.html` (675 lines) across 10 dimensions:

1. **Spacing** — margins, paddings verified via CSS class definitions ✅
2. **Colors** — CSS variable usage verified; dark mode variables present in base.css ✅
3. **Font sizes** — all match (h1: 44px, brand-subtitle: 10px, meta: 11px, etc.) ✅
4. **Animations** — toast slide (300ms), modal translateY (0.3s), ticker crossfade ✅
5. **Hover states** — course-card hover shadow, icon-btn hover bg, reorder-btn hover ✅
6. **Focus states** — inputs/textareas have `:focus` styles; **buttons/cards missing** ❌
7. **Scroll behavior** — modal overflow-y:auto, calendar-scroll-wrapper ✅
8. **Mobile layout** — breakpoints at 900/768/640/480/360px all present ✅
9. **Missing CSS classes** — zero missing classes (all referenced classes defined) ✅
10. **Dark mode** — full variable coverage in body.dark-mode block ✅

---

## Previously Flagged Issues (Wave 6) — Status

| Wave 6 Finding | Status |
|----------------|--------|
| `.course-info` class missing | ✅ Fixed (components.css:264) |
| `.course-list-empty` class missing | ✅ Fixed (components.css:74) |
| `.schedule-section-actions` class missing | ✅ Fixed (layout.css:111) |
| `.form-control` class missing | ✅ Fixed (components.css:450) |
| `.form-error` class missing | ✅ Fixed (components.css:462) |
| `.modal-footer` class missing | ✅ Fixed (modals.css:117) |
| `#course-color-hue` → `#cm-color-hue` selector mismatch | ✅ Fixed (CSS targets both IDs) |
| Color hue range 0–360 vs 0–180 | ✅ Fixed (CourseModal uses max="180") |
| Calendar collapse toggle missing | ❌ Still absent (re-filed as #102) |

---

## Verified Correct (No Issues)

- **Header**: Brand, subtitle, theme toggle (sun/moon CSS-driven), settings button — pixel match
- **Footer**: Credits text, links, responsive font scaling — exact match
- **SemesterControls**: Select, add/delete buttons, mobile icon-only delete — correct
- **CourseCard**: Colored border, reorder buttons, left-col/right-col, metadata — correct
- **CourseList**: Empty states, FAB button with add-course-icon class — correct
- **CourseModal**: 3-tab system, details form fields, schedule builder, color picker — correct
- **WeeklySchedule**: TimeGrid CSS grid, EventChip positioning (CELL_HEIGHT_PX=30), CurrentTimeLine — correct
- **HomeworkSidebar**: Urgency grouping, show-done toggle, inline add form — correct
- **HomeworkItem**: Both sidebar (event-card) and modal (homework-item) variants — correct
- **RecordingsPanel**: Tab bar, sort dropdown, add-recording input, recording items — correct
- **RecordingsTabs**: Collapsible actions, import/rename/clear/delete buttons — correct
- **SettingsModal**: 4-tab WCAG pattern, roving tabindex, arrow-key nav — correct
- **ProfileTab**: Profile CRUD, cloud sync placeholder, import/export — correct
- **AppearanceTab**: Color theme selector, hue slider, apply/cancel workflow — correct
- **CalendarTab**: Start/end hour inputs, visible days checkboxes — correct
- **FetchDataTab**: ICS input, batch toggle, Technion catalog fetch — correct
- **Toast system**: Type classes, progress bar, hover pause, slide animations — correct
- **Modal system**: Overlay transitions, focus trap, scroll lock, escape dismiss — correct
- **Dialog system**: Alert/Confirm/Prompt dialogs — correct
- **SyncConflictModal**: 3 resolution options, cancel, conflict summary — correct
- **FetchVideosModal**: YouTube/Panopto dual-source, Panopto script copy — correct
