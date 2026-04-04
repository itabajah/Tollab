# Hana — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Wave 4 — Firebase Modular SDK Migration

**Date:** 2026-04-05
**Branch:** wave-4-services
**Commit:** feat(firebase): migrate to modular Firebase SDK v10+

### What was done

1. **Installed `firebase` npm package** (modular v10+ SDK, 83 packages added)
2. **Created `src/services/firebase-config.ts`** — Loads config from `import.meta.env.VITE_FIREBASE_*`, initializes Firebase app/auth/database, gracefully handles missing config (offline mode)
3. **Created `src/services/firebase-auth.ts`** — `initAuth()`, `signInWithGoogle()` (popup with GoogleAuthProvider), `signOut()`, `onAuthStateChange()`, `getCurrentUser()` — all no-ops when Firebase not configured
4. **Created `src/services/firebase-sync.ts`** (~300 lines) — Full port of 503-line legacy `firebase-sync.js`:
   - `buildLocalPayload(data: AppData): CloudPayload` — builds clean typed payload
   - `mergeLocalAndCloud(local, cloud): CloudPayload` — timestamp-based merge with name deduplication, empty profile skipping
   - `pushToFirebase(userId, payload)` — writes to RTDB with write ID + client ID for echo prevention
   - `pullFromFirebase(userId)` — reads from RTDB
   - `subscribeToFirebase(userId, callback)` — realtime listener with echo prevention
   - `debouncedSync(userId, data)` — 750ms debounced auto-sync, skip during remote apply
   - `cancelPendingSync()`, `getIsApplyingRemote()` — state helpers
5. **Created `src/vite-env.d.ts`** — Vite client type reference + Firebase env var declarations
6. **Created `.env.example`** — Template for all `VITE_FIREBASE_*` variables

### Key decisions
- **Clean types only:** CloudPayload uses full property names (version, updatedAt, activeProfileId, profiles) — no compact `v/u/a/p/i/n/t/d` format
- **No legacy normalization:** No `normalizeCloudPayload`, `compactForStorage`, `hydrateFromStorage`, `migrateData`
- **Pure functions where possible:** `buildLocalPayload` and `mergeLocalAndCloud` take data as parameters (no direct localStorage reads)
- **AppData interface defined** in firebase-sync.ts for callers assembling local data
- **Module-level state** for clientId, writeId, isApplyingRemote, pendingSyncTimer (mirrors legacy IIFE pattern)

### Verification
- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors (22 `no-console` warnings for debug logging — appropriate)
- Pushed to `origin/wave-4-services`

## Learnings

- Vite `import.meta.env` requires a `vite-env.d.ts` reference file in `src/` for TypeScript to recognize it
- ESLint sort-imports rule requires alphabetical sorting by the local (aliased) name, not the imported name
- Firebase modular `onValue` returns an `Unsubscribe` function directly (no `.off()` pattern needed)
