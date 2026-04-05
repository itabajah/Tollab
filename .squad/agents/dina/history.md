# Dina — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Completed Work

### Wave 6 — Calendar Components (2026-04-05)
**Branch:** `wave-6-courses-calendar`
**Commit:** `31f6acf` — `feat(calendar): create WeeklySchedule, TimeGrid, EventChip, CurrentTimeLine`

Created 5 files in `src/components/calendar/`:

1. **TimeGrid.tsx** — CSS Grid structure with time column, day headers, and schedule cells. Takes `CalendarSettings` and optional `visibleDaysOverride` for mobile. Delegates cell content to parent via `cellContent` render callback.

2. **EventChip.tsx** — Absolutely-positioned `.schedule-block` inside a cell. Computes `top`/`height` from `ScheduleSlot` start/end times (30px per hour, matching legacy). Shows course color as background, course name as label, click handler for opening modal.

3. **CurrentTimeLine.tsx** — Red line at current time, updates via 60-second interval. Exports `useTimeLineCell()` hook so parent can place it in the correct cell. Uses `.current-time-line` CSS class.

4. **WeeklySchedule.tsx** — Orchestrator component. Reads courses and `CalendarSettings` from Zustand store. Builds a `(day, hour) → EventChip[]` lookup map. Renders `TimeGrid` with `cellContent` callback that injects chips and the time line. Includes mobile single-day toggle (`#mobile-day-toggle` button) with resize listener that auto-clears on desktop.

5. **index.ts** — Barrel exports.

**Verification:** typecheck ✅, lint ✅ (zero errors in calendar/), build ✅ (54 modules, 426ms).
**Pushed:** `wave-6-courses-calendar` → origin.

## Learnings

- `CalendarSettings` lives on `Semester` (per-semester config): `startHour`, `endHour`, `visibleDays`.
- Legacy calendar uses 30px cell height with absolute positioning for event blocks.
- Mobile single-day mode filters `visibleDays` to `[today]` and adds `.single-day-mode` class to `.calendar-scroll-wrapper`.
- Preact uses `class` not `className` in JSX (jsxImportSource: preact).
- `noUncheckedIndexedAccess` is enabled — all array accesses may return `undefined`.

### Wave 7 — Review Fixes for PR #53 (2026-04-07)
**Branch:** `wave-7-recordings-homework`
**Commit:** `50fbb63` — `fix(ui): address Wave 7 review — keyboard a11y, inline styles, homework modal features`

Fixed all 5 blocking issues from Malik (code quality) and Noura (UI fidelity) reviews. Omar and Layla locked out per Reviewer Rejection Protocol.

**B1 (Malik): HomeworkItem keyboard accessibility**
- Added `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) to 3 clickable `<div>` elements: sidebar event-card, modal hw-title-row, sidebar event-course badge.
- Created `handleKeyActivate()` helper for consistent keyboard handling.
- Added `handleMoveUp`/`handleMoveDown` handlers + new props (`isFirst`, `isLast`, `sortOrder`) for reorder support.

**B2 (Malik): Inline styles in HomeworkSidebar.tsx**
- Extracted urgency section header styles → `.urgency-section-label` CSS class.
- Extracted add-row top margin → `.hw-add-row-top` CSS class.
- Extracted course select layout → `.hw-course-select` CSS class.
- Moved `cursor: pointer` from inline styles to CSS (`.event-card.homework`, `.hw-title-row`).

**B3 (Malik): Inline styles in FetchVideosModal.tsx**
- Extracted 6 inline style blocks → CSS classes: `.fetch-names-toggle`, `.fetch-names-checkbox`, `.fetch-names-label`, `.fetch-status`, `.fetch-select-actions`, `.fetch-import-btn`.
- Kept `color: var(--text-secondary)` inline on `.fetch-status` (dynamic).

**B3 (Noura): Homework modal sort controls + Show Done toggle**
- Added `<div class="list-sort-controls">` with sort dropdown (6 options matching legacy) and Show Done toggle to `CourseHomeworkTab`.
- Wired to `setHomeworkSortOrder` (new store action) and `toggleShowCompletedHomework` (existing ui-store action).
- Added filtering logic: hides completed items when Show Done is unchecked.
- Added `HW_SORT_LABELS` record for dropdown display text.

**B4 (Noura): Homework modal reorder buttons**
- Added ▲/▼ reorder buttons to `HomeworkItem` modal variant, gated on `sortOrder === 'manual'`.
- Uses `.item-reorder-buttons.hw-reorder-buttons` classes (CSS already existed).
- Added `reorderHomework` store action (swaps array items + sets sort to manual).
- Added `setHomeworkSortOrder` store action.

**B5 (Noura): Sort label text**
- Changed `Sort` → `Sort:` in `RecordingsPanel.tsx` to match legacy.

**Files changed (8):**
- `src/components/homework/HomeworkItem.tsx` — keyboard a11y, reorder buttons, new props
- `src/components/homework/HomeworkSidebar.tsx` — inline styles → CSS classes
- `src/components/modals/CourseModal.tsx` — sort controls, Show Done toggle, filtering
- `src/components/modals/FetchVideosModal.tsx` — inline styles → CSS classes
- `src/components/recordings/RecordingsPanel.tsx` — "Sort:" label fix
- `src/css/components.css` — 5 new CSS classes
- `src/css/modals.css` — 6 new CSS classes
- `src/store/app-store.ts` — `reorderHomework` + `setHomeworkSortOrder` actions

**Verification:** typecheck ✅, lint ✅ (0 errors, 22 warnings all pre-existing), build ✅ (67 modules, 449ms).
**Pushed:** `wave-7-recordings-homework` → origin.

### Wave 9 — Full Header Ticker Migration (2026-04-09)
**Branch:** `wave-9-import-ticker`
**Commit:** `5c052c0` — `feat(ticker): migrate full header ticker with 100+ templates`

Migrated the entire header-ticker.js (1,500 lines legacy) into 3 typed files:

1. **src/constants/ticker-templates.ts** — All 130+ message templates organized by 26 categories (no_semester, no_courses, no_schedule, no_classes_today, all_clear, late_night, morning, weekend, class_now, class_soon, class_next, class_tomorrow, hw_nodate, hw_many, hw_all_done, hw_overdue, hw_today, hw_tomorrow, hw_soon, exam, exam_today, exam_tomorrow, exam_soon, recordings_backlog, recordings_big, recordings_clear, general, general_course_roast). Every single template from the legacy file ported exactly.

2. **src/hooks/useTickerMessages.ts** — Full context-aware message selection engine:
   - Reads semester/courses/homework/exams/recordings from Zustand store
   - Priority system matching legacy exactly: class_now (10) > exam_today/class_soon (9) > hw_overdue/hw_today (8) > hw_many (5) > class_tomorrow/recordings (4) > late_night/no_classes_today (3) > weekend/all_clear (2) > morning/general (1)
   - Time-of-day boundaries: late night 23:00–04:00, morning 05:00–10:00, weekend Fri 17:00+ / Sat / Sun <18:00
   - Deterministic per-day template shuffling via xorshift32 (same as legacy)
   - Stable course-roast-of-the-day via djb2 hash
   - De-duplication, priority sorting, placeholder resolution
   - Exports `useTickerMessages()` hook and `TickerMessage` type

3. **Updated src/components/layout/HeaderTicker.tsx** — Replaced placeholder messages with real `useTickerMessages()` hook. Dynamic badge text from message context. Rotation interval changed from 6s to 8s (matching legacy 9s interval more closely). Ref-based message tracking for stable interval callbacks.

**Verification:** typecheck ✅, lint ✅ (0 new issues), build ✅ (90 modules, 590ms).
**Pushed:** `wave-9-import-ticker` → origin.
