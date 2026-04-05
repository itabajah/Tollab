# Security Re-Scan — Review Iteration 2

**Author:** Jad (Security Reviewer)
**Date:** 2025-07-25
**Scope:** Verify iteration 1 fixes, check remaining issues, scan for new attack surfaces
**Branch:** `review-2-audit`

---

## 1. Iteration 1 Fix Verification — All 7 PASS ✅

| # | Issue | Fix Location | Verdict |
|---|-------|-------------|---------|
| 1 | #58 Panopto domain whitelist | `video.ts:17-29,73` — `ALLOWED_PANOPTO_DOMAINS` + `isAllowedPanoptoDomain()` | ✅ PASS |
| 2 | #59 URL protocol validation | `RecordingEditor.tsx:38-39`, `HomeworkEditor.tsx:73,99` — `validateUrl()` before save | ✅ PASS |
| 3 | #60 localStorage shape guard | `store-persistence.ts:146-159` — property-by-property validation | ✅ PASS |
| 4 | #65 Cheesefork JSON validation | `cheesefork.ts:96-102,177-200` — array type checks + try/catch | ✅ PASS |
| 5 | #66 __proto__ guard | `profile-store.ts:168-176` — strips `__proto__`, `constructor`, `prototype` | ✅ PASS |
| 6 | #72 Proxy URL validation | `cors-proxy.ts:130-142` — protocol validation (http/https only) | ✅ PASS |
| 7 | #74 Firebase payload validation | `firebase-sync.ts:155-163,354,390` — `isValidCloudPayload()` shape guard | ✅ PASS |

**Bonus:** Panopto `parsePanoptoClipboard` try/catch — `panopto.ts:249-253` — all JSON.parse wrapped. ✅

### Bypass Analysis

- **Panopto whitelist:** Uses `new URL()` + hostname suffix matching. Cannot bypass with `evil-panoptocloud.com` (doesn't end with `.panopto.com`). Case-insensitive (browser standard).
- **URL validation:** Uses `new URL()` which normalizes protocols to lowercase. `JAVASCRIPT:` → `javascript:` → rejected.
- **Proxy validation:** Strict `===` on `parsed.protocol`. Cannot bypass.
- **__proto__ guard:** Top-level only — nested objects not recursively sanitized. **Low risk** because: (a) `JSON.parse` creates `__proto__` as a data property, not a prototype setter; (b) shape validation (`Array.isArray(data['semesters'])`, object check on `settings`) filters downstream; (c) Zustand/Immer uses structural sharing, not `Object.assign`.

---

## 2. Remaining LOW Issues — Still Open

| # | Issue | Status | Assessment |
|---|-------|--------|------------|
| #80 | Error message leakage | **Still exists** | `cheesefork.ts:179-180` exposes raw `error.message` to UI via `ImportResult.error`. `cors-proxy.ts:200-203` stores raw error in `ProxyFetchError.details`. Still LOW — no secrets in error messages, but could leak proxy infrastructure details. |
| #84 | YouTube ID unsanitized | **Still exists** | `video.ts:54,57` — extracted IDs not format-validated before interpolation into `https://www.youtube.com/embed/${videoId}`. Still LOW — domain is hardcoded, YouTube rejects invalid IDs server-side. |

**Recommendation:** Keep both as LOW/backlog. No severity escalation needed.

---

## 3. New Findings

### NEW: #112 — Missing Content Security Policy (MEDIUM)

- **File:** `index.html` — no CSP meta tag or headers
- **Risk:** Without CSP, any future XSS vector has no browser-level mitigation
- **Positive:** Codebase is CSP-ready — no `eval()`, no inline scripts, `dangerouslySetInnerHTML` only renders hardcoded SVG constants
- **Fix:** Add `<meta http-equiv="Content-Security-Policy">` with appropriate directives
- **Filed as:** #112 with `review-2`, `security` labels

---

## 4. Deep Security Scan — No Additional Issues

| Category | Status |
|----------|--------|
| `dangerouslySetInnerHTML` | ✅ 3 uses — all hardcoded SVG icon constants |
| `eval()` / `Function()` / `document.write` | ✅ None found |
| `window.open()` | ✅ `RecordingItem.tsx:84` — uses `'noopener'`, validated URL |
| `window.postMessage` / message listeners | ✅ None found |
| `document.cookie` | ✅ None found |
| HTTPS enforcement | ✅ All hardcoded URLs are HTTPS |
| localStorage sensitivity | ✅ No tokens/passwords stored — only app data |
| Regex ReDoS | ✅ All regex patterns safe (fixed-length, no nested quantifiers) |
| Open redirects | ✅ No user-controlled redirect parameters |
| `<a>` tags with external links | ✅ All use `target="_blank" rel="noopener noreferrer"` |
| Cross-origin iframe | ✅ Only YouTube/Panopto (whitelisted domains) |

---

## 5. Summary

- **7/7 iteration 1 fixes verified** — all properly implemented with no bypass potential
- **2 LOW issues unchanged** — #80 and #84 remain open, no severity change
- **1 new MEDIUM finding** — #112 (missing CSP)
- **Overall posture:** Good. The iteration 1 fixes significantly improved security. The codebase uses no dangerous APIs, validates all external data, and enforces protocol restrictions. CSP is the main remaining gap.
