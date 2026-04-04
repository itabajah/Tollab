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
