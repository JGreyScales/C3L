# Module 4 — Sprint 3 integration and demo

## Scope

Everything in this patch lives in `src/modules/04-assignments/`. It replaces the Sprint 1–2 temporary assignment array and upload Map with persistent SQLite rows and files on disk. The **database contract** uses the agreed field names exactly: `dueAt`, `maxAttempts`, `createdBy`, and the complete Submission and Accommodation records. The legacy Sprint 1 form still calls its HTML field `dueDate`; that value is converted to the one persisted `dueAt` column. There is no duplicate deadline column.

## Current integration status

- Sprint 2 PRs #14 and #15 have been merged into the team fork's `main`.
- Sprint 3 persistence and upload implementation is on `feature/m04-sprint-3-storage` in team PR #16.
- PR #17 (submission history enhancements) is based on the Sprint 3 storage branch. Merge PR #16 first; then retarget and review #17 separately before merging it to `main`.
- The team must review/merge within the fork before submitting changes to the upstream class repository. Do not modify other teams' module directories.
- Verify `bun test src/modules/04-assignments/`, `bun run check` and the live browser workflow before merging. Run `bunx biome check --write src/modules/04-assignments` for formatting within this module only.

## Developer commands

```bash
bun install
bun test src/modules/04-assignments/
bun run check
bun src/modules/04-assignments/db/seed.ts
bun run dev
```

The module's SQLite file is created under `src/modules/04-assignments/data/assignments.db` and uploads under `data/uploads/`. Both are ignored by the module `.gitignore`. To use a different database path, set `M04_DB_PATH`. To seed a demo course record, set `M04_DEMO_COURSE_ID` and `M04_DEMO_INSTRUCTOR_ID` if appropriate. The defaults use course `1` and a placeholder instructor account; actual instructor account IDs are generated in Module 1.

`createDatabase(':memory:')` is used in the test suite, and persistence tests reopen a disk-backed database.

## Routes

| Route | Role | Purpose |
| --- | --- | --- |
| `GET /04-assignments/` | Public | Module 4 landing page |
| `GET /04-assignments/assignments?courseId=1` | Public | Course assignment list |
| `POST /04-assignments/assignments/new` | Instructor or admin | Create and persist assignment |
| `POST /04-assignments/assignments/:id/due-date` | Instructor or admin | Edit persisted deadline |
| `POST /04-assignments/assignments/:id/accommodations` | Instructor or admin | Save a deadline extension for an enrolled student |
| `POST /04-assignments/assignments/:id/submissions` | Enrolled student | New attempt, file saved to disk |
| `GET /04-assignments/assignments/:id/submissions/history` | Student or instructor | Attempt number, timestamp and status |
| `GET /04-assignments/assignments/:id/submissions/all` | Instructor or admin | Every student's current attempt (FR-011) |
| `GET /04-assignments/api/assignments?courseId=1` | Instructor, admin or enrolled student | JSON assignments and deadlines for Calendar/Dashboard (see `API.md`) |
| `GET /04-assignments/api/assignments/:id/submissions` | Student or instructor | JSON history; instructors without `studentId` get each student's current attempt (see `API.md`) |
| `GET /04-assignments/assignments/:id/submissions/:receipt` | Student owner or instructor | Receipt |
| `GET /04-assignments/assignments/:id/submissions/:receipt/file` | Student owner or instructor | Authorized file download with original name |

Students cannot specify their `studentId` on upload: the current user is read from Module 1, and enrollment checked against Module 2 `/api/courses`. The role and course checks are called through the other modules' in-process router APIs; no local HTTP server needs to be running for the module's own unit tests.

## Acceptance demo

1. In Module 1, register the first user (admin), a teacher and a student. The admin promotes the teacher to instructor. Record the two generated user IDs; do not use passwords in screenshots.
2. In Module 2, verify a course exists (its **ID** `1`, not its course code), and enroll the real student user ID on `/02-courses/enroll`.
3. Sign in as instructor; in Module 4, create a new assignment with a future deadline, maximum attempts 3.
4. Sign in as the enrolled student; upload `draft.txt`. Receipt shows **Attempt 1 — on-time**.
5. Sign in as instructor; change the assignment deadline to a time in the past. Sign back in as student and upload `final.txt`. History shows **Attempt 1 — on-time** and **Attempt 2 — late**. The first result stays on-time because deadlines/statuses are snapshots per submission.
6. Stop and restart `bun run dev` (do not delete `data/`). Open Module 4 history and both downloads as the student. Both attempts and bytes remain saved.
7. Optional: Grant that student an accommodation with a future deadline, submit a third attempt (on-time), and verify the fourth is rejected (409) because `maxAttempts=3`.
