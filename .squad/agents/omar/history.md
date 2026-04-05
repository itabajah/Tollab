# Omar — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- `useFocusTrap` hook created at `src/components/modals/useFocusTrap.ts` — shared across all dialog components for WCAG-compliant Tab cycling, scroll lock, and previous focus restoration.
- Layout CSS classes added to `layout.css`: `.cloud-status-text`, `.add-course-icon`, `.schedule-section-header`, `.schedule-section-title`, `.homework-section-header`, `.homework-section-title`.
- Existing `.schedule-header` in `calendar.css` is for grid day-of-week headers — do not reuse for section headings.

## Session Log

### 2025-07-18 — Fix Malik's PR #51 review findings (B1 + B2)

**Task:** Fix two blocking issues from Malik's code quality review on wave-5-core-ui.

**B1 — Focus trap (WCAG):**
- Created `useFocusTrap` hook extracting scroll lock, previous-focus save/restore, and Tab-key cycling from Modal.tsx's pattern.
- Applied to AlertDialog, ConfirmDialog, PromptDialog — each now calls `handleTabKey(e)` in its `handleKeyDown`, trapping Tab within the dialog.
- Each dialog keeps its own initial-focus logic (confirm button or input field).

**B2 — Inline styles:**
- Removed all 6 static `style=` attributes from Header.tsx (1) and MainLayout.tsx (5).
- Added 6 new CSS classes to `layout.css` to replace them.
- No existing classes matched; all new classes use descriptive names that don't collide with calendar.css's `.schedule-header`.

**Verification:** typecheck ✅, lint ✅ (0 errors, 22 pre-existing warnings in services/), build ✅ (361ms).

**Commit:** `3a6816b` on `wave-5-core-ui`, pushed.

### 2025-07-19 — Wave 6: Create CourseModal (3-tab modal)

**Task:** Create `src/components/modals/CourseModal.tsx` — the main course editing modal with 3-tab structure.

**What was built:**
- **3 tabs:** Recordings (Wave 7 placeholder), Homework (Wave 7 placeholder), Details (fully functional).
- **Details tab:** Course name (validated), number, points, lecturer, faculty, location, grade, syllabus, notes, exam dates (Moed A/B), weekly schedule builder, color picker (hue slider with live preview).
- **Schedule builder:** Lists current slots (day + time range), add new slot via day selector + start/end time inputs, remove slots. Wired to `ui-store.tempSchedule` actions.
- **Add/Edit mode:** Determined by `editingCourseId` in ui-store. Add mode shows only Details tab; Edit mode shows all 3 tabs and populates form from existing course data.
- **Connected to:** `app-store` (addCourse, updateCourse, deleteCourse), `ui-store` (editingCourseId, tempSchedule, closeCourseModal), selectors (useCourseById, useCurrentSemester).
- **Delete course:** Two-click confirmation (button text changes to "Confirm Delete").
- **CSS additions:** Added `.form-row`, `.error-text`, `.schedule-slot-list`, `.schedule-slot-row`, `.schedule-slot-label`, `.schedule-slot-remove`, `.schedule-add-row`, `.schedule-time-separator`, `.color-picker-row`, `.color-preview-swatch` classes to `components.css`. No inline styles except dynamic `backgroundColor` on the color preview swatch.

**Verification:** typecheck ✅, lint ✅ (0 errors, 22 pre-existing warnings), build ✅ (426ms).

**Commit:** `a3e9498` on `wave-6-courses-calendar`, pushed.

### 2025-07-20 — Wave 7: Create Recording Components & FetchVideosModal

**Task:** Create all recording-related components for the CourseModal recordings tab and the FetchVideosModal for importing videos.

**What was built:**
- **RecordingsPanel** (`src/components/recordings/RecordingsPanel.tsx`): Main recordings UI — tab bar via RecordingsTabs, sort dropdown (6 options from RECORDING_SORT_ORDERS), add-recording input (paste link → auto-named), filtered recording list using `useSortedRecordings` selector. Supports show/hide watched via `settings.showWatchedRecordings`.
- **RecordingsTabs** (`src/components/recordings/RecordingsTabs.tsx`): Tab switching with count badges, collapsible Recording Actions panel (import, rename, clear, delete, show-done toggle). Add tab via prompt. Protected tabs (lectures/tutorials) cannot be deleted. All actions wired to app-store.
- **RecordingItem** (`src/components/recordings/RecordingItem.tsx`): Watched checkbox toggle, clickable name area (opens inline preview for embeddable videos, external link otherwise), video/slides link chips, edit button (triggers inline editor), delete button, reorder up/down buttons (only in manual sort mode). Uses `getVideoEmbedInfo` from utils/video.
- **VideoPreview** (`src/components/recordings/VideoPreview.tsx`): Inline iframe embed for YouTube/Panopto with close button. Platform-aware label. Only one preview open at a time (controlled by parent via `previewIndex` state).
- **RecordingEditor** (`src/components/recordings/RecordingEditor.tsx`): Inline edit form for name, video link, slides link with save/cancel buttons. Enter to save, Escape to cancel. Calls `updateRecording` on save.
- **FetchVideosModal** (`src/components/modals/FetchVideosModal.tsx`): YouTube playlist import (URL → CORS proxy fetch → parse HTML → video checklist) and Panopto import (console script copy → paste JSON → parse → video checklist). Select/deselect all, use original names toggle, import button adds selected videos to current tab via `addRecording`.
- **Barrel exports** (`src/components/recordings/index.ts`): All 5 recording components exported.
- **CourseModal wired** (`src/components/modals/CourseModal.tsx`): Recordings tab placeholder replaced with `RecordingsPanel` + `FetchVideosModal`. FetchModal open state managed locally.

**CSS:** All existing recording CSS classes from components.css and modals.css used (recordings-control-panel, recording-item, recording-edit-section, panopto-import-guide, etc.). No new CSS added. Dynamic inline styles only for FetchVideosModal layout elements matching legacy HTML.

**Verification:** typecheck ✅, lint ✅ (0 errors), build ✅ (420ms).

**Commit:** `eef3776` on `wave-7-recordings-homework`, pushed.

### 2025-07-21 — Fix PR #54 review findings (Wave 8 settings, profiles, themes)

**Task:** Address all blocking issues from Malik's code quality review and Noura's UI fidelity review on `wave-8-settings-profiles`. Sami and Hana were locked out.

**B1 — WCAG tab bar (Malik):**
- Added `role="tablist"` + `aria-label` to `.settings-modal-tabs` container.
- Each tab button now has `role="tab"`, `aria-selected`, `aria-controls`, `id`, and `tabIndex` (roving tabindex: active=0, others=-1).
- Each panel now has `role="tabpanel"`, `aria-labelledby`, and `id`.
- Added `onKeyDown` handler with ArrowLeft/ArrowRight (wrapping), Home/End support + focus management.

**B2 — SyncConflictModal inline styles (Malik):**
- Replaced all 17 static `style={{…}}` props with CSS classes.
- Created 9 new classes in `modals.css`: `.sync-conflict-icon`, `.sync-conflict-description`, `.sync-conflict-summary`, `.sync-conflict-summary-row`, `.sync-conflict-options`, `.sync-conflict-option-btn`, `.sync-conflict-option-label`, `.sync-conflict-option-desc`, `.sync-conflict-cancel-btn`.

**B3 — 17 missing CSS class definitions (Noura):**
- Added 13 new classes to `components.css`: `.settings-tab-content`, `.settings-section-title`, `.settings-subsection-title`, `.settings-description`, `.settings-day-checkbox`, `.settings-days-container`, `.settings-batch-label`, `.settings-batch-year`, `.settings-batch-hint`, `.settings-divider`, `.settings-status`, `.settings-external-link`, `.settings-unsaved-indicator`, `.settings-theme-buttons`.
- 6 calendar preview classes no longer needed (preview removed per B4).

**B4 — Extra non-legacy features (Noura):**
- Removed "Display Mode" dark/light toggle from AppearanceTab (legacy toggle lives in Header only).
- Added apply/cancel workflow to AppearanceTab: pending local state for theme/hue changes, Apply commits to store, Cancel reverts. Unsaved changes indicator matches legacy `#theme-unsaved-indicator`.
- Removed calendar preview section from CalendarTab (not in legacy).
- Also fixed N3 (inline style on visible-days container → `.settings-days-container` CSS class).

**Verification:** typecheck ✅, lint ✅ (0 errors, 28 pre-existing warnings), build ✅ (476ms).

**Commit:** `ef62968` on `wave-8-settings-profiles`, pushed.
