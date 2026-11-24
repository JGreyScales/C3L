# Sprint 3 — Module 4 Release Notes (candidate; not yet released)

## Service information
- Name: Module 4 — Assignment & Submission System (C3L)
- Team fork: https://github.com/Ameer-sys/C3L
- Upstream: https://github.com/JGreyScales/C3L
- Feature branch: `feature/m04-sprint-3-storage` (published; team PR #16 open for review)
- Issue: #13, `M04: Replace temporary assignment storage with persistent storage` (was closed before implementation; link in PR and ask maintainer whether to reopen or track follow-up)

## New functionality / fixes
- Persistent SQLite tables for assignments, submissions and accommodations using agreed fields.
- Disk-backed PDF/TXT uploads with randomized physical file names and ignored data directory.
- Persisted assignment creation and due-date changes.
- Per-student attempt sequencing and enforcement of `maxAttempts` (default 3).
- Immutable on-time/late status calculated against the effective submission deadline.
- Per-student history, receipt/download authorization and JSON history endpoint.
- Instructor-approved deadline accommodations and fixed filename in Content-Disposition.
- Test cases for SQLite reopen, two attempts, restart, file download, role/ownership and attempt limits.

## Testing
- Module 4 Bun test suite passed: 65 tests, 0 failures (before review fixes).
- Full `bun run check` passed locally: 250 tests, 0 failures (before review fixes).
- Review fixes cover archived-course read access, hiding instructor-only controls, and chronological sorting of deadlines with mixed UTC offsets.
- Re-run `bun test src/modules/04-assignments/` and `bun run check` after applying review changes, and verify the live browser workflow before merging.

## Known issues and dependencies
- Instructor course ownership cannot be verified against Module 2's hardcoded demo instructor IDs.
- Module 2 enrollment state resets on process restart. Existing owners retain receipt/history access, but must re-enroll to submit a new attempt.
- Team PR #16 is open and awaiting review/merge; the class upstream PR remains pending.
- Archived courses permit reading previously saved submissions and history, but block creating assignments, changing deadlines, adding accommodations and new student uploads.
