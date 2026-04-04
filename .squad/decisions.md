# Squad Decisions

## Active Decisions

### 2026-04-05T00:50:09Z : Git Workflow Rules
**By:** Ibrahim Tabajah (via Copilot)
**What:**
- Branch naming: squad-branch/wave-N-description for wave work, squad-branch/review-N-fix-description for review fixes
- Commit messages: Conventional Commits format (feat, fix, refactor, test, docs, chore)
- PR template: wave number, issue reference, what changed, how to test, screenshots, reviewer checklist
- Never push to main
- No force pushes on any shared branch
- Squash merge sub-branches into squad-branch
- Delete sub-branches after merge
**Why:** User-defined git workflow constraints for consistent team operations.

### 2026-04-05T00:50:09Z : Migration Hard Rules (User Directives)
**By:** Ibrahim Tabajah (via Copilot)
**What:**
1. Always use claude-opus-4.6 for every agent spawn, no exceptions.
2. Re-read DOCUMENTATION.md before starting, before each wave, and before any wave is declared complete.
3. Never push to main. All work on squad-branch or sub-branches. Use PRs from sub-branches into squad-branch.
4. Every PR must pass CI checks (lint, typecheck, test, build) before merge. No --no-verify, no force pushes.
5. The existing UI must remain visually identical. Pixel-perfect fidelity required.
6. Every module migration must maintain full feature parity with the original JS.
7. No merge without required reviewer gates.
8. Every task must reference a GitHub issue, declare its wave, and define an exit test.
9. Commits must be atomic, well-messaged, scoped (Conventional Commits format).
10. Use GitHub Issues for tracking, GitHub PRs for code review, GitHub Actions for CI.
11. No migration code, no backward compatibility code, no legacy format support. Clean-slate rewrite.
12. No compact storage format. Full readable typed interfaces only.
**Why:** User-defined migration program rules — foundational constraints for all agents.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
