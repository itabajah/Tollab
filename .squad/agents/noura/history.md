# Noura — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- All 7 CSS files from the legacy app are preserved in `src/css/` and imported by the Vite build.
- The legacy `.app-layout` is a two-column flex layout collapsing at ≤900px — MainLayout.tsx reproduces this exactly via slot-based composition.
- Toast CSS classes live in `toast.css` which also houses confirm-dialog, prompt-dialog, and alert-dialog styles.
- Modal overlay CSS uses `.modal-overlay.active` pattern for visibility transitions — new Modal.tsx applies `active` class when `isOpen` is true.
- Header theme toggle relies on CSS-driven icon visibility (`.theme-icon-sun`/`.theme-icon-moon`) via `body.dark-mode` class toggle — no inline display styles needed.

## Review History

### 2026-04-05: PR #51 — Wave 5 Core UI Components
**Verdict:** ✅ APPROVED
**Scope:** Header, MainLayout, HeaderTicker, Footer, SemesterControls, Toast system (Toast, ToastContainer, ToastContext), Modal system (Modal, AlertDialog, ConfirmDialog, PromptDialog), UI primitives (Button, IconButton, Select, Checkbox)
**Findings:** Zero missing CSS classes. All structural elements match legacy HTML. Responsive behavior preserved. Three non-blocking deferred items (scroll-to-homework button, ticker default visibility, ticker badge text) correctly scoped to Waves 7–9.
**Review file:** `.squad/decisions/inbox/noura-wave5-review.md`
