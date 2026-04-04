# Zara — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- **Wave 0 review (PR #46):** Tooling foundation is solid. Strict TS config (`strict: true` + `noUncheckedIndexedAccess`) is the right call for a migration. Vite+Vitest co-located config is clean. CI has all 4 gates (lint, typecheck, test, build) on PRs to squad-branch. Deploy is safely disabled with `if: false`. Legacy `.eslintrc.js` coexists with new flat config — non-blocking but should be cleaned up. All pipeline gates pass locally.
