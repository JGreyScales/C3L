# Sprint 3 — Module 4 Release Notes (candidate; not yet released)

## Service information
- Name: Module 4 — Assignment & Submission System (C3L)
- Team fork: https://github.com/Ameer-sys/C3L
- Upstream: https://github.com/JGreyScales/C3L
- Feature branches: `feature/m04-sprint-3-storage` (PR #16), `feature/m04-sprint-3-history` (PR #17), `feature/m04-sprint-3-accommodations` (accommodations management, late-tracking tests, test report)
- Issue: #13, `M04: Replace temporary assignment storage with persistent storage` (was closed before implementation; link in PR and ask maintainer whether to reopen or track follow-up)

## New functionality / fixes
- Persistent SQLite tables for assignments, submissions and accommodations using agreed fields.
- Disk-backed PDF/TXT uploads with randomized physical file names and ignored data directory.
- Persisted assignment creation and due-date changes.
- Per-student attempt sequencing and enforcement of `maxAttempts` (default 3).
- Immutable on-time/late status calculated against the effective submission deadline.
- Per-student history, receipt/download authorization and JSON history endpoint.
- Instructor-approved deadline accommodations and fixed filename in Content-Disposition.
- Instructor accommodations management: lists every extension on an assignment and removes one (FR-012).
- The submit page shows a student their own effective deadline when they have an accommodation; the reason stays instructor-only.
- Test cases for SQLite reopen, two attempts, restart, file download, role/ownership and attempt limits.

## Testing
- Module 4 Bun test suite: 82 tests, 0 failures (adds late-tracking and accommodation tests).
- Full `bun run check` (lint + typecheck + all tests + module sanity): 267 tests, 0 failures; all 12 modules OK.
- Covers on-time/late status (including exactly-on-deadline and one-second-late), resubmission, restart persistence, accommodations grant/list/remove, the student's extended-deadline view, and the 401/403/409 access cases.
- Full matrix and the live demo runbook: `docs/sprint3-test-report.md`.

## Known issues and dependencies
- Instructor course ownership cannot be verified against Module 2's hardcoded demo instructor IDs.
- Module 2 enrollment state resets on process restart. Existing owners retain receipt/history access, but must re-enroll to submit a new attempt.
- Team PR #16 is open and awaiting review/merge; the class upstream PR remains pending.
- Archived courses permit reading previously saved submissions and history, but block creating assignments, changing deadlines, adding accommodations and new student uploads.
