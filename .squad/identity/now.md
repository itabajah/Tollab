# Current Focus

**Wave 1: Types & Constants — COMPLETE ✅**

Wave 1 type system foundation delivered: 11 type files (591 lines) + 9 constants files (396 lines), all 12 domain interfaces verified against DOCUMENTATION.md §5, 19 constants verified against legacy implementations, zero legacy patterns, acyclic module graph, complete type safety (zero `any`, proper enums/unions), JSON serialization safety, ReadonlySet for immutability.

**Wave 2: Zustand Stores & State Management — COMPLETE ✅**

Wave 2 state management complete: 4 Zustand stores (1154 lines) + storage service (171 lines), app-store with ProfileData shape and immer middleware, profile-store for metadata, ui-store for ephemeral state, selectors with legacy JS logic, clean localStorage interface with 10 functions and runtime validation. 3-reviewer cycle (Nadia/Zara/Jad) found 4 findings (1 data-loss bug, 1 security vulnerability, 2 type issues), all fixed by Rami and re-approved. PR #48 squash-merged to squad-branch.

**Wave 3: Utilities & Validation — COMPLETE ✅**

Wave 3 utilities layer delivered: 9 utility modules (823 lines) + validation layer (17 validators, 3 result types, 448 lines), 294 unit tests (100% function coverage), pure side-effect-free functions with zero state dependencies. All 8 security-critical sanitizers validated against attack vectors (XSS, path traversal, null bytes, control chars). 4-reviewer cycle (Malik/Zara/Yasmin/decision): 2 approvals → REQUEST CHANGES (test gaps) → Rami +88 tests → Yasmin APPROVED. PR #49 squash-merged to squad-branch.

**Wave 4: Services & API Integration — COMPLETE ✅**

Wave 4 services layer delivered: Firebase modular SDK (3 files: config, auth, sync, 371 lines) + external API services (5 files: cors-proxy, youtube, panopto, technion-catalog, cheesefork, 1,250 lines). Firebase three-layer architecture with clean separation (config → auth/sync leaves), echo prevention (clientId + writeId dual-layer), user isolation via `tollab/users/{uid}/data` Firebase path. External APIs use hardcoded proxy URLs (no injection vectors), regex extraction with strict charsets (YouTube: `[a-zA-Z0-9_-]{11}`, Panopto UUID: `[a-f0-9-]{36}`). 2-reviewer cycle (Zara/Jad): both APPROVED with non-blocking observations. PR #50 squash-merged to squad-branch.

**Wave 5: Component Integration & UI Rendering — COMPLETE ✅**

Wave 5 component layer delivered: Toast system (4 files, 241 lines) with auto-dismiss, progress bar, hover pause/resume, 5-visible cap. Modal system (5 files, 321 lines) with focus trap (Tab cycling + previous-focus restore, useFocusTrap hook), AlertDialog/ConfirmDialog/PromptDialog variants. UI primitives (4 files, 183 lines): Button/IconButton/Select/Checkbox with zero inline styles, proper a11y. Layout components (5 files, 217 lines): Header (theme toggle, settings), MainLayout (two-column responsive), Footer, HeaderTicker, SemesterControls. 3-reviewer cycle (Malik round 1 REQUEST CHANGES/Noura APPROVE/Omar fix/Malik round 2 APPROVE). PR #51 (+1,665 lines, 30 files) squash-merged to squad-branch.

**Wave 6: Course Management UI — NEXT**

Priority is implementing course listing, add/edit/delete course UI, consuming course-store state and dispatching actions. Wire course selection to MainLayout. Connect to catalog search (Wave 4 technion-catalog service). Expected artifacts: CourseList component, AddCourseModal, EditCourseModal, delete confirmation dialogs. Data flow: components ↔ ui-store (editing state) ↔ app-store (courses list) ↔ storage/Firebase sync.
