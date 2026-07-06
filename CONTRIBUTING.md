# Contributing to Tollab

Thanks for your interest! This is a small, quality-gated codebase — the checks below are the same ones CI runs, so if `pnpm verify` is green your change will pass.

## Setup

- **Node ≥ 22** and **pnpm 11** (`packageManager` is pinned in `package.json`).

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

## The one command that matters

```bash
pnpm verify
```

runs, in order: **typecheck → lint (zero warnings) → format check → coverage → build**. CI additionally runs the Playwright E2E suite and a 450 KB gzipped-bundle budget. Handy sub-commands:

```bash
pnpm test           # unit + component tests (Vitest)
pnpm test:watch     # watch mode
pnpm test:coverage  # with per-layer coverage floors
pnpm e2e            # Playwright (Chromium) — builds + previews first
pnpm lint           # ESLint (--max-warnings 0)
pnpm format         # Prettier --write
```

## Ground rules

- **Respect the layers.** Imports flow one way and are enforced by ESLint:
  `domain → services → store → features`. `domain/` must stay free of React, zustand, and firebase; `services/` must not import the store or features.
- **Keep `domain/` pure and deterministic.** No `new Date()`/`Math.random()` in logic — take `now`/`today` as parameters and let the injected clock flow in. Zod schemas in `domain/model.ts` are the single source of truth; derive types from them.
- **Tests live next to code** (`*.test.ts[x]`). Add or update tests with every change; coverage floors are strictest in `domain/`. Prefer driving behavior through public APIs over asserting internals.
- **Accessibility & theming.** New UI must work in both light and dark themes, keep the monochrome identity (color only via course hues / status tokens), be keyboard-operable, and honor `prefers-reduced-motion`.
- **Formatting is automated.** Don't hand-format; run `pnpm format`.

## Commits & PRs

- Conventional-commit style is used (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Keep PRs focused; make sure `pnpm verify` is green before opening one.
