# Jad — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Work Log

### 2026-04-05: Security Review — Wave 2 Storage Service (PR #48)
- **Verdict:** REQUEST CHANGES
- **Blocking:** Storage key collision — `DATA_PREFIX` (`tollab_`) + profileId can collide with reserved keys (`tollab_profiles`, `tollab_settings`, `tollab_active`). A crafted import with `id: "profiles"` overwrites the profile registry. Fix: change prefix to `tollab_data_` or validate profileId against reserved suffixes.
- **Non-blocking:** No import rollback on partial write failure; no `__proto__` stripping (low risk since JSON.parse is safe, but defense-in-depth); no length/charset validation on profileId.
- **Passed:** localStorage read safety, shape validation on all loads, error handling, data exposure (no sensitive data), store isolation (no direct localStorage in src/store/).
- **Review written to:** `.squad/decisions/inbox/jad-wave2-review.md`

## Learnings

- `STORAGE_KEYS.DATA_PREFIX` shares the `tollab_` namespace with reserved keys — must be tracked if prefix changes.
- Store files (`src/store/*.ts`) are intentionally side-effect-free; all localStorage goes through `src/services/storage.ts`.
