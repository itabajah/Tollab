# Sami — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- Toast CSS uses `toast-visible` / `toast-hiding` classes for slide-in/out animations; progress bar uses `@keyframes toast-progress` with `scaleX`.
- Modal CSS uses `.modal-overlay.active` for visibility and `.modal` transform for slide-up entrance.
- Dialog CSS classes (`.confirm-dialog-modal`, `.prompt-dialog-modal`, `.alert-dialog-modal`) are defined in `toast.css`, not `modals.css`.
- `dangerouslySetInnerHTML` with Preact requires `{ __html: string }` — TypeScript strict mode rejects `string | undefined`, use nullish coalescing with fallback.
- `noUncheckedIndexedAccess` in tsconfig means `Record<string, T>` indexed access returns `T | undefined`.

## Wave 5 — Core UI Components

**Date:** 2026-04-05
**Branch:** `wave-5-core-ui`
**Commit:** `6214580` — `feat(ui): create toast system, modal system, and UI primitives`

### What was delivered

**14 files, 962 lines total:**

#### Toast System (`src/components/toast/`)
- **ToastContext.tsx** — Preact context + provider with `useToast()` hook. `showToast(message, type, options)` and `dismissToast(id)`. Local context, no Zustand. Max 5 visible, oldest evicted. Default 4s (6s for errors).
- **Toast.tsx** — Individual toast: icon (exact legacy SVGs), message, optional description, optional action button, close button, animated progress bar. Hover pauses auto-dismiss timer with remaining-time tracking.
- **ToastContainer.tsx** — Fixed bottom-right container rendering active toast stack.
- **index.ts** — Barrel exports.

#### Modal System (`src/components/modals/`)
- **Modal.tsx** — Generic wrapper: backdrop click-to-close, scroll lock, Escape dismiss, focus trap (Tab/Shift+Tab), transition animations. Props: `isOpen`, `onClose`, `title`, `children`, `size` (sm/md/lg).
- **ConfirmDialog.tsx** — `Promise<boolean>` pattern via `onResolve` callback. Enter confirms, Escape cancels. Supports `dangerous` mode (btn-danger).
- **PromptDialog.tsx** — `Promise<string | null>` pattern. Text input with custom validation function, required flag, error display. Enter submits, Escape cancels.
- **AlertDialog.tsx** — `Promise<void>` pattern. OK button + icon per type (info/success/warning/error). Enter/Escape dismisses.
- **index.ts** — Barrel exports.

#### UI Primitives (`src/components/ui/`)
- **Button.tsx** — variant (primary/secondary/danger), size (sm/md/lg), disabled, loading states. Uses `.btn-primary`, `.btn-secondary`, `.btn-danger` from components.css.
- **IconButton.tsx** — Icon-only button with `aria-label` and `title` tooltip. Uses `.icon-btn`.
- **Select.tsx** — Styled native `<select>` with typed `SelectOption[]`, placeholder support.
- **Checkbox.tsx** — Native checkbox with label, accent-color styled by CSS.
- **index.ts** — Barrel exports.

### Design decisions
- Toast uses Preact Context (not Zustand) as specified — ephemeral UI state doesn't need global persistence.
- All SVG icons are exact copies from legacy `toast.js` TOAST_TYPES — pixel-perfect fidelity.
- All CSS classes reference existing `toast.css`, `modals.css`, `components.css` — zero new CSS files.
- No inline styles anywhere — all styling via className.
- Dialog components use `onResolve` callback prop instead of internal Promise creation — keeps components declarative while callers can wrap in Promise if needed.

### CI status
- `npm run typecheck` — 0 errors ✅
- `npm run lint` — 0 errors, 0 warnings from new files ✅
- Pushed to `wave-5-core-ui` ✅

## Wave 6 — Review Fix Pass (PR #52)

**Date:** 2026-04-06
**Branch:** `wave-6-courses-calendar`
**Commit:** `43316f1` — `fix(ui): address Wave 6 review — keyboard a11y, CSS classes, text fixes`

### Context

Malik and Noura reviewed PR #52 and requested changes. Original authors (Layla, Dina, Omar) locked out per Reviewer Rejection Protocol. I picked up all fixes.

### Malik's blocking issues fixed

- **B1: CourseCard keyboard handler** — Added `handleKeyDown` callback with Enter/Space activation. `tabIndex={0}` was already present; added `onKeyDown` prop to the div with `role="button"`.
- **B2: Inline fontSize in CourseList** — Removed `style={{ fontSize: '18px' }}` from the `+` span, replaced with `.add-course-icon` CSS class in `components.css`.

### Noura's findings fixed

- **6 missing CSS classes added:**
  - `.course-info` → `components.css` — flex column container for faculty/lecturer/location rows
  - `.course-list-empty` → `components.css` — centered italic placeholder for empty states
  - `.schedule-section-actions` → `layout.css` — flex row for mobile-day-toggle wrapper
  - `.form-control` → `components.css` — full-width input matching legacy select styling
  - `.form-error` → `components.css` — error text with error color, matching `.error-text` pattern
  - `.modal-footer` → `modals.css` — flex row for action buttons with gap and end-alignment
- **Color picker CSS selector** — Added `#cm-color-hue.full-spectrum` alongside legacy `#course-color-hue.full-spectrum` in the gradient rule, webkit thumb rule, and moz thumb rule. Also added base appearance reset for `#cm-color-hue`.
- **Color hue max** — Changed from `max="360"` to `max="180"` to match legacy half-spectrum. Updated `defaultHue()` range from 360→180 accordingly.
- **AddSemesterModal text** — Fixed label ("Semester" → "Select Semester"), button ("Add Semester" → "Create Semester"), placeholder ("e.g. Winter 2024" → "e.g., Special Term 2024").

### CI status

- `npm run typecheck` — 0 errors ✅
- `npm run lint` — 0 errors, 0 warnings from changed files ✅
- `npm run build` — Pass (561ms) ✅
- Pushed to `wave-6-courses-calendar` ✅
