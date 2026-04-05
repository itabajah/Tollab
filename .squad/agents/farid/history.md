# Farid — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Learnings

### Wave 2 — Zustand Store Creation (2026-04-05)

- **immer middleware is essential** for the app store. The state tree is 4–5 levels deep (semesters → courses → recordings → tabs → items). Without immer, every mutation would need 4+ nested spreads. Zustand's `immer` middleware from `zustand/middleware/immer` with the `immer` npm package makes deeply-nested updates readable and safe.
- **Sort orders live outside the Course type.** The Course interface doesn't include `recordingsSortOrder` or `homeworkSortOrder` (by design — Nadia kept domain types clean). I store them as separate `Record<courseId, ...>` maps in the app store, which avoids polluting the data model with display preferences.
- **Profile store only holds metadata.** Profile data (semesters, settings) lives in the app store. The profile store manages the list of profiles and active profile ID. Cross-store reads via `useAppStore.getState()` are used when needed (e.g., exporting the active profile).
- **`noUncheckedIndexedAccess: true` matters.** Array indexing returns `T | undefined`, so every `array[index]` needs a null check. Regex capture groups (`match[1]`) also need the `?.[1] !== undefined` pattern.
- **ID generation uses `crypto.randomUUID()`.** Clean, browser-native, no external dependency. Defined as a private helper in each store file to avoid coupling.

### Wave 10 — Event System Cleanup (2026-07-23)

- **Zero window.* global exports in src/.** The legacy app exported ~40 functions to `window.*` for HTML `onclick` handlers. The Preact rewrite has none — all events use Preact's `onClick`, `onChange`, etc. via JSX. Verified by grep: no `window.X = ...` assignments exist in src/.
- **Store persistence wired via Zustand subscribe.** Created `src/services/store-persistence.ts` which:
  - Loads profiles + active profile data from localStorage on startup
  - Subscribes to app-store changes → debounced (500ms) save to localStorage
  - Subscribes to profile-store changes → saves profile list, reloads data on profile switch
  - Called once in `src/main.tsx` before first render
- **useCalendarTime hook created.** `src/hooks/useCalendarTime.ts` returns current Date, refreshes on minute boundaries (aligned to :00s) for smooth calendar "now" line updates.
- **main.tsx stays clean.** Entry point: import CSS, init persistence, render `<App />`. No window exports, no DOM manipulation, no legacy patterns.
- **All standard window.* Web API usages are fine.** `window.confirm`, `window.open`, `window.innerWidth`, `window.addEventListener`, `window.setInterval` are all legitimate browser APIs — not custom global exports.
