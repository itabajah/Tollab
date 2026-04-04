# Jad — Project History

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA (18 global-scope modules, ~9,800 lines) → modern typed Preact app
- **Hard rules:** No legacy migration code, no compact storage format, pixel-perfect UI fidelity, all work on squad-branch

## Work Log

### 2026-04-05: Security Review — Wave 2 Storage Service (PR #48)
- **Verdict:** REQUEST CHANGES
- **Blocking:** Storage key collision — `DATA_PREFIX` (`tollab_`) + profileId can collide with reserved keys (`tollab_profiles`, `tollab_settings`, `tollab_active`). A crafted import with `id: "profiles"` overwrites the profile registry. Fix: change prefix to `tollab_data_` or validate profileId against reserved suffixes.
- **Non-blocking:** No import rollback on partial write failure; no `__proto__` stripping (low risk since JSON.parse is safe, but defense-in-depth); no length/charset validation on profileId.
- **Passed:** localStorage read safety, shape validation on all loads, error handling, data exposure (no sensitive data), store isolation (no direct localStorage in src/store/).
- **Review written to:** `.squad/decisions/inbox/jad-wave2-review.md`

### 2026-04-05: Security Review — Wave 4 Services (PR #50)
- **Verdict:** APPROVE (no blocking issues)
- **Scope:** 8 files in `src/services/` — firebase-auth.ts, firebase-config.ts, firebase-sync.ts, cors-proxy.ts, youtube.ts, panopto.ts, technion-catalog.ts, cheesefork.ts
- **Passed:** Firebase Auth scoping (Google-only, SDK-managed tokens), Firebase path isolation (`tollab/users/${uid}/data` with SDK-generated UID), CORS proxy hardcoded URLs with `encodeURIComponent`, no SSRF vectors, no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`DOMParser` in services, YouTube playlist ID extraction (regex + reconstructed canonical URL), Panopto HTML parsing via regex only (no DOM), ICS parser extracts known fields only, JSON.parse for structured data (safe), Preact JSX auto-escaping for all output.
- **Non-blocking observations:** (1) `pullFromFirebase` and `subscribeToFirebase` cast Firebase response as `CloudPayload` without runtime shape validation — recommend adding shape guard for defense-in-depth. (2) `parsePanoptoClipboard` accepts `url` field from user JSON without protocol validation — component layer should validate before use in `<a href>`.
- **CI:** Typecheck 0 errors, Lint 0 errors (22 console warnings).
- **Review written to:** `.squad/decisions/inbox/jad-wave4-review.md`

## Learnings

- `STORAGE_KEYS.DATA_PREFIX` shares the `tollab_` namespace with reserved keys — must be tracked if prefix changes.
- Store files (`src/store/*.ts`) are intentionally side-effect-free; all localStorage goes through `src/services/storage.ts`.
- Firebase sync path `tollab/users/${uid}/data` uses Firebase Auth SDK-generated UIDs — not user-controlled. Security Rules must enforce `auth.uid === $uid` server-side.
- CORS proxies are hardcoded in `src/constants/api.ts` — all three use `encodeURIComponent`. No user-injectable proxy URLs.
- YouTube service reconstructs canonical URLs from extracted playlist IDs — never passes raw user URLs to fetch.
- All HTML parsing in services uses regex only (no DOMParser, no innerHTML). Safe from script execution.
