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
