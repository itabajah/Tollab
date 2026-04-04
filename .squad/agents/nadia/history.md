# Nadia — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

### 2025-07-25 — Wave 0 Tooling Review (PR #46)
- Reviewed and **APPROVED** the Wave 0 tooling setup
- **tsconfig.json** is properly strict: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: false`, `jsxImportSource: "preact"`
- Path alias `@/*` → `./src/*` is configured in both tsconfig and vite.config.ts
- ESLint uses flat config (v9+) with `@typescript-eslint` parser and plugin
- Vitest is configured inline in vite.config.ts with jsdom environment, co-located test pattern `src/**/*.{test,spec}.{ts,tsx}`
- CI gates: lint → typecheck → test → build on PRs to squad-branch
- Deploy workflow is correctly disabled (`if: false`) during migration
- All 7 CSS files preserved from legacy app
- Note for Wave 1: will need `vite-env.d.ts` when importing non-TS assets
