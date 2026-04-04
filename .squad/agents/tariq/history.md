# Tariq — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

- **Wave 0 tsconfig is data-safe:** `strict: true` + `noUncheckedIndexedAccess: true` confirmed. All indexed access on Records/Maps will require narrowing — essential for typed Firebase data models.
- **Zustand 5 in place:** Supports TypeScript generics natively. Store slices can be fully typed without wrapper hacks.
- **No legacy contamination in src/:** Only 3 .tsx files. CSS carries over from legacy but contains no data logic — just a "compact" UI comment.
- **Build pipeline verified:** `npm run build && npm run typecheck && npm run test` all pass clean on Wave 0.
