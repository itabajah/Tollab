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
