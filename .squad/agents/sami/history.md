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
