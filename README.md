<div align="center">

# Tollab

**A fast, offline-first academic dashboard for Technion students.**

Semesters · weekly schedule · homework · lecture recordings · Moed A/B exam roadmap · a playful reminders ticker — all in one monochrome, keyboard-friendly workspace that works offline and syncs across your devices when you sign in.

[**Live at tollab.co.il →**](https://tollab.co.il)

[![CI](https://github.com/itabajah/Tollab/actions/workflows/ci.yml/badge.svg)](https://github.com/itabajah/Tollab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-black.svg)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-black.svg)](https://vite.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-black.svg)](https://www.typescriptlang.org)
[![tests](https://img.shields.io/badge/tests-930%2B-black.svg)](#testing--quality)
[![coverage ~96%](https://img.shields.io/badge/coverage-~96%25-black.svg)](#testing--quality)

</div>

---

## Why Tollab

Technion coursework is scattered across Cheesefork, the SAP catalog, Panopto, and a dozen browser tabs. Tollab pulls it into one place and keeps it there — **your data lives in your browser first**, so it's instant and works without a connection. Sign in with Google and it syncs, last-write-wins, across every device. No account is required to use it.

## Features

|                                   |                                                                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📅 **Weekly schedule**            | Lane-packed grid with a live "now" line, all-day exam/homework chips, a collapsible view, and a mobile single-day mode. Overnight (past-midnight) classes render correctly.               |
| ✅ **Homework**                   | Per-course and cross-course views, six sort orders, due-date urgency badges, inline notes and links, manual reordering that respects hidden/completed items.                              |
| 🎓 **Exam roadmap**               | A serpentine Moed A/B roadmap that **auto-activates 14 days before your first exam**, with day-gap emphasis, hide/restore, and custom exams.                                              |
| 🎥 **Recordings**                 | Per-course tabs with inline YouTube/Panopto previews, natural-order sorting, and bulk import from a playlist or Panopto folder.                                                           |
| 📥 **One-click import**           | Pull your whole schedule from a Cheesefork ICS link (single or batch across semesters), then enrich courses from the public Technion SAP catalog — existing values are never overwritten. |
| ☁️ **Offline-first + cloud sync** | localStorage is the source of truth; optional Google sign-in syncs all profiles through a single Realtime Database node with a conflict-safe last-write-wins merge.                       |
| 🌗 **Monochrome by design**       | A single-accent light/dark design system built on Tailwind v4 tokens. Color enters only through per-course hues and status signals. Honors `prefers-reduced-motion`.                      |
| 👥 **Profiles**                   | Keep multiple degrees/tracks side by side; each syncs independently.                                                                                                                      |

## Architecture

A strictly **layered** codebase — the import direction is one-way and **enforced by ESLint**, so `domain` can never reach for React or the store, and `services` can never import a feature:

```
domain/      Pure logic — no React / zustand / firebase / DOM.
             Zod schemas (the single source of truth), colors, semester /
             course / homework / recordings rules, calendar grid math,
             the exam-mode roadmap, the reminders ticker, and the cloud merge.
      ▲
services/    Framework-free side effects. storage (v3 codec + export/import),
             sync (protocol / engine / backends), firebase adapters, and
             importers (Cheesefork ICS, Technion catalog, YouTube / Panopto).
      ▲
store/       Zustand stores + a session controller (persistence, profiles)
             and the sync host/controller wiring.
      ▲
features/    React feature slices: courses, calendar, homework, recordings,
             exam-mode, ticker, settings, sync, semesters, layout, app.
components/   The UI kit (Button, Dialog, Toast, Confirm/Prompt, Field, icons…).
hooks/ lib/   Cross-cutting hooks and pure helpers (dates, video embeds, URL safety).
```

**Time is injected, never read ad-hoc.** A single clock flows from the composition root through the session, stores, and a `useNow()` context, so every relative date is deterministic and testable — there are no stray `new Date()` calls in logic.

### Data flow

```
UI action → store mutation (stamps lastModified) → 250ms debounce → localStorage
                                                  ↘ notify sync → 750ms debounce → RTDB
RTDB change → echo-suppressed → last-write-wins merge with local → applied to the UI
```

One Realtime Database node per user (`tollab/users/<uid>/data`) holds every profile. Merges are a pure last-write-wins union by profile id, so an offline edit or a device-local profile is never clobbered by a stale cloud copy.

## Tech stack

| Area       | Choice                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Build / UI | **Vite 7**, **React 19**, **TypeScript** (strict + `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| Styling    | **Tailwind CSS v4** (CSS-first `@theme`), monochrome tokens, light/dark via `[data-theme]`                   |
| State      | **Zustand v5** + **immer**; pure domain kept React-free                                                      |
| Validation | **Zod v4** — domain model → types, storage codec, import/export, cloud payload                               |
| Cloud      | **Firebase v11** (Auth + Realtime Database), sign-in with Google                                             |
| Primitives | **Radix UI**, **react-resizable-panels**                                                                     |
| Testing    | **Vitest** (unit + jsdom component), **Playwright** E2E, **MSW** for network mocks                           |
| Tooling    | **ESLint 9** flat config (lint-enforced boundaries) + **Prettier**, **pnpm**, Node ≥ 22                      |

## Getting started

```bash
pnpm install
pnpm dev            # Vite dev server on http://localhost:5173
```

Common scripts:

```bash
pnpm test           # unit + component tests
pnpm test:coverage  # with per-layer coverage gates
pnpm e2e            # Playwright (builds + previews first)
pnpm verify         # typecheck + lint + format:check + coverage + build (the CI gate)
```

Cloud sync is optional. Without `VITE_FIREBASE_*` env vars the app runs fully offline and the sync UI shows "unavailable". Copy `.env.example` to `.env.local` and fill in your Firebase web config to enable it locally.

> **Windows note:** if `node`/`pnpm` aren't on your `PATH`, prefix commands with the Node install dir, e.g. `pnpm` run from PowerShell with `C:\Program Files\nodejs` on `PATH`.

## Testing & quality

Quality is gated in CI on every push and PR:

- **930+ unit & component tests** at **~96% line coverage**, with **per-layer coverage floors** (strictest in `domain/`, looser in `features/`) that fail the build if breached.
- **Playwright** end-to-end suite (Chromium) covering the shell, onboarding, and course flows.
- `pnpm verify` runs **typecheck → lint (zero warnings) → format check → coverage → build**, and CI additionally enforces a **450 KB gzipped bundle budget**.
- Enforced architecture: `domain → services → store → features` import boundaries are checked by ESLint, not convention.

## Privacy & data handling

Tollab is a personal, per-user app; your schedule lives in your browser and (optionally) in your own Firebase project.

- **Cloud sync** is scoped per user by Realtime Database rules — each account can read/write only `tollab/users/<uid>/data`.
- **Imports** (Cheesefork ICS, YouTube playlists, Panopto folders) run through a CORS proxy because those hosts don't send permissive CORS headers. In development this is a same-origin dev-server proxy restricted to the specific import hosts; the production build falls back to public proxies (allorigins / codetabs), so a link you paste to import transits a third-party proxy. Catalog enrichment fetches the public Technion dataset from GitHub directly.

## Deployment

GitHub Actions builds `dist/` and publishes to **GitHub Pages** (custom domain via `public/CNAME`). Firebase web config is injected at build time from repository secrets (the Firebase web API key is a public client identifier — access control rests on the RTDB rules + Google Auth, not the key). The deploy workflow is `workflow_dispatch`-only until cutover, to protect the live site.

Realtime Database rules live in `database.rules.json` (referenced by `firebase.json`): deny-by-default with per-user isolation and a payload-shape check. Deploy them with the manual **Deploy Firebase Database Rules** workflow (needs `FIREBASE_TOKEN` + `FIREBASE_PROJECT_ID`) or locally via `npx firebase-tools deploy --only database`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup and the `pnpm verify` gate. Security reports: see [SECURITY.md](SECURITY.md).

## Acknowledgements

- A ground-up React/TypeScript rewrite of an earlier vanilla-JS app of the same name.
- Course data via the public [Technion SAP info dataset](https://github.com/michael-maltsev/technion-sap-info-fetcher).
- Schedule import built around [Cheesefork](https://cheesefork.cf) calendar exports.

## License

[MIT](LICENSE) © Ibrahim Tabajah
