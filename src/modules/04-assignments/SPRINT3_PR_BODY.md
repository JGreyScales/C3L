## What did you add or change?

Adds the Module 4 Sprint 3 persistence and integration layer: SQLite schema and repositories, permanent file uploads, per-student attempt limits, on-time/late submission snapshots, approved deadline accommodations, history/receipt/download routes and tests. Preserves the Sprint 1 HTML `dueDate` input while persisting the agreed `dueAt` column.

## Which module is this for?

Module 4 (`src/modules/04-assignments/`). **No other team module files are changed.**

## Where is this pull request going?

- [x] **Inside my team:** base is `Ameer-sys/C3L` `main` from `feature/m04-sprint-3-storage`
- [ ] To class repository (later, after internal merge and admin review)

## Checklist

- [x] Only files under Module 4 were changed
- [ ] Fork synced with upstream; resolve any integration conflicts
- [ ] `bun run check` passes (pending actual Bun environment)
- [ ] Browser end-to-end demo verified (pending live accounts)
- [x] Automated tests added/updated (pending execution)
- [ ] Teammate reviewed and approved

## Manual verification steps

1. `bun install`; `bun test src/modules/04-assignments/`; `bun run check`
2. Register admin, instructor and student in Module 1; enroll student in Module 2.
3. Create assignment, upload first and second attempts around due-date change.
4. Confirm history statuses, restart the server, confirm both receipts/files remain.
5. Confirm nonowner student cannot download an attempt and maxAttempts is enforced.

## Open coordination questions

- Module 2: real instructor IDs and enrollment persistence (needed for strict owner authorization and a clean post-restart demo).
- Module 4: confirm with Lanna and Cheryl that JSON history endpoint and accommodation form match their UI/tests.
