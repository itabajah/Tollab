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

### 2026-04-06: Security Audit — Wave 12+ Review Iteration 1 (Full Codebase)
- **Scope:** Comprehensive security audit of entire codebase — src/components/, src/services/, src/store/, src/utils/, src/constants/, src/hooks/
- **Verdict:** 9 findings filed (2 HIGH, 5 MEDIUM, 2 LOW)
- **HIGH findings:**
  1. **Panopto domain injection** (#58): `src/utils/video.ts:52-62` — user-controlled domain extracted from Panopto URL flows directly into iframe embed URL. No whitelist validation. Fix: validate against known Panopto domains.
  2. **javascript: XSS in user-entered URLs** (#59): `RecordingEditor.tsx:37-38`, `HomeworkEditor.tsx:70-73` — video/slide/homework links stored without protocol validation, rendered in `<a href>` and `window.open()`. Fix: use existing `validateUrl()` before saving.
- **MEDIUM findings:**
  3. **localStorage UI state unvalidated** (#60): `store-persistence.ts:142-147` — `JSON.parse(raw) as typeof uiState` without shape guard. Corrupt data crashes app.
  4. **Cheesefork JSON elements unvalidated** (#65): `cheesefork.ts:98-102` — array elements cast as `ParsedICSEvent[]` without per-element validation.
  5. **Profile import missing __proto__ check** (#66): `profile-store.ts:150-194` — no dangerous-key stripping on import. Also applies to `storage.ts:safeGetItem()`.
  6. **fetchViaProxy no URL validation** (#72): `cors-proxy.ts:126-141` — no protocol/host validation before passing to proxy.
  7. **Firebase cloud payload unvalidated** (#74): `firebase-sync.ts:335-338, 366-369` — `pullFromFirebase` and `subscribeToFirebase` cast snapshot as `CloudPayload` without shape guard.
- **LOW findings:**
  8. **Error message leakage** (#80): `cors-proxy.ts:186-189`, `cheesefork.ts:179-180` — raw error messages may contain internal details.
  9. **YouTube videoId unsanitized** (#84): `video.ts:38-49` — extracted ID not format-validated before interpolation (low risk: domain hardcoded).
- **Passed (no issues):**
  - `dangerouslySetInnerHTML`: 3 uses (Toast.tsx, AlertDialog.tsx, CourseModal.tsx) — all render static SVG icon constants, not user data. ✅
  - `innerHTML` / `eval` / `DOMParser` / `document.write`: none found in src/. ✅
  - HeaderTicker: uses `textContent` (safe), not `innerHTML`. Template resolution is string-only with no HTML. ✅
  - localStorage in `storage.ts`: `loadFromLocalStorage()` validates shape via `isValidProfileData()`, `loadProfileList()` validates via `isValidProfile()`, `loadSettings()` validates via `isValidSettings()`. Falls back to defaults on failure. ✅
  - CORS proxies: hardcoded HTTPS URLs in `constants/api.ts`, `encodeURIComponent()` on all parameters. ✅
  - Firebase path: `tollab/users/${uid}/data` uses Firebase Auth SDK UID (not user-controlled). ✅
  - Profile export filename: sanitized via regex in `ProfileTab.tsx:166`. ✅
  - Import data validation: `validateImportedData()` in `validation.ts` validates structure recursively. ✅
  - All `<a>` tags with external links use `target="_blank" rel="noopener noreferrer"`. ✅
- **Review written to:** `.squad/decisions/inbox/jad-review1-security.md`
