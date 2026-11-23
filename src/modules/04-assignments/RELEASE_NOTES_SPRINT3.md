# Sprint 3 — Module 4 Release Notes (candidate; not yet released)

## Service information
- Name: Module 4 — Assignment & Submission System (C3L)
- Team fork: https://github.com/Ameer-sys/C3L
- Upstream: https://github.com/JGreyScales/C3L
- Feature branch: `feature/m04-sprint-3-storage` (create and push locally; not published yet)
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
- SQLite schema tested independently via Python's sqlite3 (see handoff report).
- TypeScript syntax parsed using the TypeScript compiler parser.
- **Bun tests and full `bun run check` are still pending. Do not mark passing until actually run.**

## Known issues and dependencies
- Instructor course ownership cannot be verified against Module 2's hardcoded demo instructor IDs.
- Module 2 enrollment state resets on process restart. Existing owners retain receipt/history access, but must re-enroll to submit a new attempt.
- GitHub PR review, merge and class upstream PR remain pending for human/admin approval and GitHub write access.
