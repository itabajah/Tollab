# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Architecture, wave planning, triage | Amir | Architecture decisions, wave sequencing, issue creation, sign-off |
| Type system, interfaces, ADRs | Nadia | TypeScript interfaces, constants, validation types, store contracts |
| Storage schema, data model | Tariq | localStorage format, Firebase data model, serialization |
| Layout, courses, homework UI | Layla | Header, CourseList, CourseCard, HomeworkSidebar, App.tsx, cleanup |
| Recordings, item-logic UI | Omar | RecordingsPanel, RecordingItem, VideoPreview, CourseModal, FetchVideosModal |
| Calendar, ticker | Dina | WeeklySchedule, TimeGrid, EventChip, HeaderTicker, ticker templates |
| Settings, modals, toast, theme | Sami | SettingsModal, Toast, ConfirmDialog, Button, theme system |
| State management, Zustand | Farid | app-store, profile-store, ui-store, selectors, window.* cleanup |
| Firebase, auth, sync | Hana | firebase-auth.ts, firebase-sync.ts, SyncConflictModal |
| External APIs, utilities | Rami | CORS proxy, YouTube, Panopto, Cheesefork, Technion, utils/* |
| Integration tests | Yasmin | tests/integration/*, test strategy, coverage analysis |
| Unit tests | Karim | tests/unit/*, migrate existing tests, edge cases |
| E2E tests | Lina | tests/e2e/*, Playwright, full user flow tests |
| Architecture review | Zara | Module boundaries, circular deps, store review, performance audit |
| Code quality review | Malik | TypeScript best practices, no any, patterns, error handling |
| UI fidelity review | Noura | Pixel-perfect comparison, visual regressions, CSS review |
| Security review | Jad | Firebase rules, XSS, CORS, sanitization, URL validation |
| Build, CI/CD, config | Khalil | Vite, GitHub Actions, tsconfig, ESLint, Prettier, package.json |
| Documentation | Rana | DOCUMENTATION.md, TSDoc, onboarding, contributing guidelines |
| Session logging | Scribe | Automatic — never needs routing |
| Work monitoring | Ralph | Backlog scan, issue triage, PR status, continuous pipeline |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
