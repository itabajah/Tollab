# Decision: Wave 2 Store Architecture

**Date:** 2026-04-05
**By:** Farid (State Management Dev)
**Wave:** 2 — State Management

## What

Created four Zustand store files in `src/store/`:

1. **app-store.ts** — Main application store replacing `appData` global. Uses immer middleware for deeply-nested mutations. Contains all semester/course/recording/homework/schedule CRUD, settings management, and bulk import actions.

2. **profile-store.ts** — Profile metadata management (profile list, active profile ID). Reads app-store state cross-store for export. Does NOT hold profile data — that's the app-store's responsibility.

3. **ui-store.ts** — Transient ephemeral state (modal stack, editing context, temp form data, sidebar toggle). Nothing persisted. Includes a `resetUi()` action for clean state on navigation.

4. **selectors.ts** — Derived-state hooks: `useCurrentSemester`, `useCourseById`, `useAllCourses`, `useHomeworkByUrgency`, `useCourseProgress`, `useSortedRecordings`, `useSortedHomework`. All implement the exact sorting/filtering logic from the legacy JS.

## Key Design Decisions

- **Sort orders stored separately from Course type.** `recordingSortOrders` and `homeworkSortOrders` are `Record<string, ...>` maps in the app store, not on the Course interface. This keeps the domain model clean (as Nadia designed it) while preserving full sort order functionality.

- **Actions are pure — no side effects.** No localStorage writes, no Firebase sync. `saveData()` only bumps `lastModified`. Persistence will be wired via Zustand subscribers or middleware in a later wave.

- **immer middleware for all stores.** Even the UI store uses immer for consistency, though its state is shallow. The app store deeply benefits from it (4–5 level nesting).

- **`importCourses` merges intelligently.** Matches existing courses by number or name. Updates exam dates and deduplicates schedule slots on match. Creates new courses on miss. Mirrors the legacy `processImportedData` logic.

## Impact

All team members building components (Wave 3+) should import from `@/store/app-store`, `@/store/profile-store`, `@/store/ui-store`, and `@/store/selectors` for state access.
