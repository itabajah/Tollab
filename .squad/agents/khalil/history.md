# Khalil — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

### Wave 0 — Tooling Setup (completed)

**Config file locations:**
- `vite.config.ts` — Vite + Vitest config (Preact preset, path aliases, jsdom test env)
- `tsconfig.json` — TypeScript strict mode, Preact JSX, `@/` path alias, includes `src/` and `tests/`
- `tsconfig.node.json` — Vite config file compilation
- `eslint.config.js` — ESLint flat config (TS + Preact rules, `no-explicit-any: warn`)
- `.prettierrc` — Formatting (semi, singleQuote, tabWidth 2, trailingComma es5, printWidth 100)
- `.github/workflows/ci.yml` — PR CI: lint → typecheck → test → build (triggers on PR to squad-branch)
- `.github/workflows/deploy.yml` — GitHub Pages deploy (disabled with `if: false` until migration complete)

**Package versions installed (Wave 0):**
- `preact@10.25.x`, `zustand@5.x`
- `vite@6.4.x`, `@preact/preset-vite@2.9.x`
- `typescript@5.7.x`, `vitest@3.2.x`
- `eslint@9.x`, `@typescript-eslint/*@8.x`
- `@testing-library/preact@3.2.x`, `@testing-library/jest-dom@6.6.x`
- `jsdom@25.x`, `playwright@1.48.x`, `prettier@3.4.x`

**npm scripts:**
- `dev` — Vite dev server
- `build` — `tsc --noEmit && vite build` (typecheck + bundle)
- `preview` — Vite preview of dist/
- `lint` — ESLint on src/
- `typecheck` — `tsc --noEmit`
- `test` — `vitest run`
- `test:watch` — `vitest` (watch mode)
- `test:coverage` — `vitest run --coverage` (v8 provider)

**Key decisions:**
- Old `index.html` renamed to `index.legacy.html` (preserved for legacy app)
- CSS copied as-is to `src/css/` (originals in `css/` untouched)
- `public/` holds `favicon.svg` and `CNAME` for Vite static serving
- `tests/setup.ts` uses `@testing-library/jest-dom/vitest` for matcher extensions
- Vitest `globals: true` for jest-dom compatibility
- `tsconfig.json` includes both `src` and `tests` directories
- Branch: `wave-0-tooling` (pushed to origin)

### Wave 10 — Build Finalization (completed)

**Build output verified (`npm run build`):**
- `dist/index.html` — 0.50 KB (entry point)
- `dist/assets/index-*.js` — 122 KB raw / **41 KB gzipped** (well under 200 KB budget)
- `dist/assets/index-*.css` — 68 KB raw / 11 KB gzipped
- `dist/favicon.svg` — copied from `public/`
- `dist/CNAME` — copied from `public/` (tollab.co.il)

**Config verified:**
- `base: '/'` in `vite.config.ts` — correct for custom domain on GitHub Pages
- CI workflow (`ci.yml`) runs lint → typecheck → test → build on PRs to squad-branch
- Deploy workflow (`deploy.yml`) ready but disabled (`if: false`) until migration complete

**Fixes applied:**
- Added `react` and `react-dom` as npm aliases to `@preact/compat` in devDependencies — fixes Zustand's `import from 'react'` in test environment (vitest). The `@preact/preset-vite` plugin handles this for builds, but vitest's Node.js ESM resolution for node_modules bypasses Vite aliases.
- Fixed `src/App.test.tsx` — replaced `@testing-library/preact`'s `render()` with direct `preactRender()` to avoid `act()` infinite hang when multiple Zustand-subscribed components are in the tree. Known Preact compat issue with testing-library's act wrapper.

**All npm scripts verified:**
- `npm run dev` — starts Vite dev server ✓
- `npm run build` — produces dist/ with correct output ✓
- `npm run lint` — 0 errors, 28 warnings (all `no-console` in Firebase services) ✓
- `npm run typecheck` — passes ✓
- `npm test` — 10 files, 294 tests pass ✓
- `npm run preview` — serves built app, returns HTTP 200 ✓

- Branch: `wave-10-cleanup` (pushed to origin)

