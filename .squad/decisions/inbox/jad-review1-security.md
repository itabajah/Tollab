# Review 1 — Security Audit Summary

**Reviewer:** Jad (Security)
**Date:** 2026-04-06
**Scope:** Full codebase security audit — all files in src/
**Branch:** review-1-audit

## Verdict: 9 Findings (2 HIGH, 5 MEDIUM, 2 LOW)

The codebase demonstrates solid security fundamentals — Preact JSX auto-escaping, proper `rel="noopener noreferrer"` on external links, hardcoded CORS proxy URLs, and comprehensive `validateImportedData()` for structured imports. However, two HIGH-severity gaps exist in URL handling that must be addressed before any public deployment.

---

## HIGH Severity — Must Fix

### 1. Panopto Embed Domain Injection (#58)
- **File:** `src/utils/video.ts:52-62`
- **Issue:** User-supplied Panopto URL's domain is extracted via regex and used directly in iframe `src`. Attacker crafts URL with arbitrary domain → iframe loads attacker content in trusted UI.
- **Fix:** Validate domain against whitelist of known Panopto instances.

### 2. javascript: XSS via User-Entered URLs (#59)
- **Files:** `RecordingEditor.tsx:37-38`, `HomeworkEditor.tsx:70-73`, `RecordingItem.tsx:184,198`, `HomeworkItem.tsx:187,350`
- **Issue:** Video/slide/homework URLs saved with only `.trim()`, no protocol check. `javascript:` URLs execute on click via `<a href>` and `window.open()`.
- **Fix:** Use existing `validateUrl()` (which enforces http:/https: only) before saving.

---

## MEDIUM Severity — Should Fix

### 3. localStorage UI State Unvalidated (#60)
- **File:** `store-persistence.ts:142-147`
- **Issue:** `JSON.parse(raw) as typeof uiState` — type assertion without shape guard. Corrupt localStorage crashes the app on profile load.

### 4. Cheesefork JSON Elements Unvalidated (#65)
- **File:** `cheesefork.ts:98-102`
- **Issue:** External JSON array elements cast as `ParsedICSEvent[]` without per-element field checks. Malformed data from upstream API causes runtime crashes.

### 5. Profile Import Missing Prototype Pollution Guard (#66)
- **File:** `profile-store.ts:150-194`, also `storage.ts:69-76`
- **Issue:** No check for `__proto__`, `constructor`, `prototype` keys in parsed JSON. Defense-in-depth requires explicit stripping.

### 6. fetchViaProxy No URL Validation (#72)
- **File:** `cors-proxy.ts:126-141`
- **Issue:** Target URL never validated for protocol or hostname before proxying. Could pass `file:`, `javascript:`, or private IPs to external proxies.

### 7. Firebase Cloud Payload Unvalidated (#74)
- **File:** `firebase-sync.ts:335-338, 366-369`
- **Issue:** `pullFromFirebase` and `subscribeToFirebase` cast Firebase snapshot as `CloudPayload` without shape validation. Corrupted cloud data could crash the app.

---

## LOW Severity — Consider Fixing

### 8. Error Message Information Leakage (#80)
- **Files:** `cors-proxy.ts:186-189`, `cheesefork.ts:179-180`
- **Issue:** Raw `error.message` strings exposed in `ProxyFetchError.details` and import results. May contain internal URLs, IPs, or stack traces.

### 9. YouTube Video ID Not Format-Validated (#84)
- **File:** `video.ts:38-49`
- **Issue:** Extracted videoId not validated against expected format (11 chars, alphanumeric). Low risk since domain is hardcoded to `youtube.com`.

---

## Passed Checks (No Issues Found)

| Category | Status | Notes |
|----------|--------|-------|
| `dangerouslySetInnerHTML` | ✅ SAFE | 3 uses — all render static SVG icon constants |
| `innerHTML` / `eval` / `DOMParser` | ✅ CLEAN | None found in src/ |
| Ticker/marquee templates | ✅ SAFE | Uses `textContent`, not `innerHTML` |
| localStorage validation (storage.ts) | ✅ GOOD | Shape guards on all load functions |
| CORS proxy URLs | ✅ SECURE | Hardcoded HTTPS with `encodeURIComponent` |
| Firebase path construction | ✅ SAFE | Uses Firebase Auth SDK UIDs |
| Profile export filename | ✅ SANITIZED | Regex-cleaned before download |
| External link attributes | ✅ PROPER | All use `target="_blank" rel="noopener noreferrer"` |
| Import data validation | ✅ THOROUGH | `validateImportedData()` validates structure |

---

## Recommended Fix Priority

1. **Immediate:** #58 (Panopto domain), #59 (javascript: XSS) — both are exploitable with user interaction
2. **Next sprint:** #60 (localStorage), #65 (Cheesefork), #66 (__proto__), #72 (proxy URL), #74 (Firebase payload)
3. **Backlog:** #80 (error messages), #84 (YouTube ID)
