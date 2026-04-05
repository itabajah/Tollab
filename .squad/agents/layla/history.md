# Layla — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- CSS classes from legacy HTML are the source of truth — use `class` not `className` (Preact JSX).
- The `app-layout` wraps both `.container` (left/courses) and `.calendar-container` (right/sidebar); Header, Ticker, SemesterControls live *inside* `.container`, not above it.
- HeaderTicker crossfade uses two overlapping `<span>` elements with `is-active`/`is-exiting` CSS classes — no JS animation API needed.
- `useAppStore` and `useUiStore` are the hooks for state; selectors like `useCurrentSemester()` wrap them for derived data.
- Theme toggle applies `dark-mode` class to `document.body` — CSS variables in base.css handle the rest.
- Footer is outside `.app-layout`, fixed at the bottom via `.site-footer` CSS.

## Work Log

### Wave 5 — Layout Components (2026-04-05)
**Branch:** `wave-5-core-ui`
**Commit:** `a92711d`

**Created:**
1. `src/components/layout/Header.tsx` — Brand section (Tollab + "For Technionez"), theme toggle (sun/moon SVGs), settings gear button, cloud status indicator (placeholder "Not connected"). Uses `useAppStore` for theme state. Toggles `body.dark-mode` on click.
2. `src/components/layout/HeaderTicker.tsx` — Crossfade ticker with two overlapping `<span>` slots. Rotates 3 static placeholder messages every 6s. Wave 9 will replace with full 100+ template engine. Uses `is-active`/`is-exiting` CSS classes.
3. `src/components/layout/SemesterControls.tsx` — Semester `<select>` dropdown from store, add button (pushes `add-semester` modal), delete button with `window.confirm()`. Uses `useCurrentSemester` selector.
4. `src/components/layout/MainLayout.tsx` — Two-column flex layout via `app-layout` class. Left: `.container` with slot prop. Right: `.calendar-container` with placeholder schedule and homework areas. Responsive collapse handled by existing layout.css.
5. `src/components/layout/Footer.tsx` — Exact match of legacy footer with credits and links.
6. `src/components/layout/index.ts` — Barrel re-exports.
7. `src/App.tsx` — Root shell composing Header → Ticker → SemesterControls → MainLayout → Footer. Syncs `body.dark-mode` via `useEffect`. Placeholder comment for ToastContainer.

**Verification:**
- `npm run typecheck` — ✅ pass
- `npm run lint` — ✅ 0 errors (24 pre-existing warnings in other files)
- `vite build` — ✅ builds successfully (50.57 kB JS, 63.89 kB CSS)
- Pushed to `wave-5-core-ui`

### Wave 6 — Course Components & AddSemesterModal (2026-04-05)
**Branch:** `wave-6-courses-calendar`
**Commit:** `416d400`

**Created:**
1. `src/components/courses/CourseProgress.tsx` — Watched/completed indicators matching legacy `buildProgressHtml()`. SVG icons inline (lectures icon, homework icon). Uses `useCourseProgress(courseId)` selector. Returns null when all counters zero.
2. `src/components/courses/CourseCard.tsx` — Full course card matching legacy `createCourseCard()`. Colored left border via `borderLeftColor` style. Reorder buttons (▲/▼) via `reorderCourse` store action. Meta parts (number • points • grade) in both `.course-meta-right` and `.course-meta-info-mobile`. Click → `openCourseModal(courseId)` + `pushModal('course-modal')`.
3. `src/components/courses/CourseList.tsx` — Renders course cards from `useAllCourses()`. Empty state messages for no-semester and no-courses. "Add Course" FAB button at bottom. Uses `useCurrentSemester()` to detect semester state.
4. `src/components/courses/index.ts` — Barrel re-exports.
5. `src/components/modals/AddSemesterModal.tsx` — Semester creation form with preset dropdown (3 years × 3 seasons = 9 options + Custom). Custom name input with validation (non-empty, ≤50 chars). Calls `addSemester()` + `setCurrentSemester()` on submit. Uses Wave 5 Modal component.

**Updated:**
6. `src/App.tsx` — Replaced placeholder course list div + add button with `<CourseList />` component. Added `<AddSemesterModal />` to root.
7. `src/components/modals/index.ts` — Added `AddSemesterModal` barrel export.

**Verification:**
- `npm run typecheck` — ✅ pass
- `npm run lint` — ✅ 0 errors in my files (1 pre-existing error in CourseModal.tsx from another agent, 22 pre-existing warnings)
- `vite build` — ✅ builds successfully (57.56 kB JS, 65.32 kB CSS)
- Pushed to `wave-6-courses-calendar`
