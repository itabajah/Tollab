# Decision: Migration Issue Structure

**Author:** Amir (Tech Lead)
**Date:** 2025-07-17

## Decision
Created the full GitHub Issues program for Tollab v2 TypeScript migration:
- 1 umbrella issue (#17) tracking the entire 13-wave migration
- 28 child issues, one per module/deliverable across waves 0–12+
- 23 labels for wave tracking and category filtering

## Rationale
- Every wave and module has a discrete, trackable issue with owner, branch, deliverables, and exit tests
- Umbrella issue provides a single dashboard with task list checkboxes for progress tracking
- Labels enable filtering by wave number and work category (types, services, components, etc.)

## Impact
All team members should reference their assigned issues when creating branches and PRs. Branch naming follows the convention `wave-N/descriptive-name` as specified in each issue.
