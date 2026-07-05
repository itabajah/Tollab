# Tollab

Academic management for Technion students — semesters, courses, weekly schedule,
homework, lecture recordings, Moed A/B exams with an auto-activating exam
roadmap, a playful reminders ticker, and Google-account cloud sync.

Live at [tollab.co.il](https://tollab.co.il).

## Stack

- **Vite 7** + **React 19** + **TypeScript** (strict, `exactOptionalPropertyTypes`)
- **Tailwind CSS v4** (CSS-first `@theme`) — monochrome design system, light/dark via `[data-theme]`
- **Zustand v5** (+ immer) stores; pure domain logic kept React-free
- **Zod v4** as the single source of truth (domain model → types, storage codec, import/export, cloud payload)
- **Firebase v11** (Auth + Realtime Database) for optional cloud sync
- **Radix UI** primitives; **react-resizable-panels** split layout
- **Vitest** (unit + jsdom component) · **Playwright** E2E · **MSW** available for network mocks
- **ESLint 9** flat config (lint-enforced layer boundaries) + **Prettier** · **pnpm**

## Architecture

Layered, with import boundaries enforced by ESLint:

```
domain/     Pure logic — no React/zustand/firebase/DOM. Zod schemas, colors,
            semester/course/homework/recordings rules, calendar grid math,
            exam-mode roadmap, ticker, cloud-merge.
services/   Side effects, framework-free. storage (v3 codec + export/import),
            sync (protocol/engine/backends), firebase adapters, importers
            (Cheesefork ICS, Technion catalog, YouTube/Panopto).
store/      Zustand stores + session controller (persistence, profiles) + sync host/controller.
features/   React feature slices (courses, calendar, homework, recordings,
            exam-mode, ticker, settings, sync, semesters, layout).
components/ UI kit (Button, Dialog, Toast, Confirm/Prompt, Field…).
hooks/ lib/ Cross-cutting hooks and pure helpers (dates, video embeds).
```

Data flows `Zod domain model → v3 localStorage → optional Firebase RTDB`
(one node per user holding all profiles, last-write-wins merge).

## Development

```bash
pnpm install
pnpm dev            # Vite dev server
pnpm test           # unit + component tests
pnpm test:coverage  # with coverage gates
pnpm e2e            # Playwright (builds + previews first)
pnpm verify         # typecheck + lint + format:check + coverage + build
```

Cloud sync is optional: without `VITE_FIREBASE_*` env vars the app runs fully
offline and the sync UI shows "unavailable". Copy `.env.example` to `.env.local`
to enable it locally.

## Deployment

GitHub Actions builds `dist/` and publishes to GitHub Pages (custom domain via
`public/CNAME`). Firebase config is injected at build time from repository
secrets. The deploy workflow is manual-dispatch (`workflow_dispatch`) until
cutover to protect the live site.

Realtime Database security rules live in `database.rules.json` (referenced by
`firebase.json`): they deny everything by default and grant each user read/write
only under `tollab/users/<uid>/data` where `auth.uid === <uid>`, with a light
payload-shape check. Deploy them with the manual `Deploy Firebase Database Rules`
workflow (needs `FIREBASE_TOKEN` + `FIREBASE_PROJECT_ID` secrets) or locally via
`npx firebase-tools deploy --only database`.
