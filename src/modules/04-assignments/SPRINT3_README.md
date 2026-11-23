# Module 4 — Sprint 3 integration and demo

## Scope

Everything in this patch lives in `src/modules/04-assignments/`. It replaces the Sprint 1–2 temporary assignment array and upload Map with persistent SQLite rows and files on disk. The **database contract** uses the agreed field names exactly: `dueAt`, `maxAttempts`, `createdBy`, and the complete Submission and Accommodation records. The legacy Sprint 1 form still calls its HTML field `dueDate`; that value is converted to the one persisted `dueAt` column. There is no duplicate deadline column.

## Apply in the correct order

1. Have a teammate review and merge fork PR #14. Cheryl's branch `feature/m04-sprint-2-testing` is based on PR #14; create its separate PR into the fork **after** #14 merges, and merge it after review.
2. On a clean local checkout of `Ameer-sys/C3L`, add `upstream` if absent, then merge `upstream/main` into the fork's `main`. Do not force push or rebase. Install with `bun install` and run `bun run check`. Work on a feature branch, never commit directly to `main`.
3. Overlay this patch on `feature/m04-sprint-3-storage`. It changes only Module 4 files. Keep existing `dueDate.ts`, `layout.ts`, and the other previous tests in that folder.
4. Run `bun test src/modules/04-assignments/`, then `bun run check`. If you need to autoformat, target only Module 4 (`bunx biome check --write src/modules/04-assignments`), not the entire repository.
5. Open a draft PR from your **fork** branch into `Ameer-sys/C3L:main`. Let Lanna/Cheryl review the schema and APIs immediately. After review and checks, merge into fork main.
6. Once integration is stable, open a fork `main` -> class `main` PR for Sprints 1–2, then a separate upstream PR when Sprint 3 is complete. Do not push to class `main` directly.

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
| `GET /04-assignments/api/assignments/:id/submissions` | Student or instructor | JSON history for integration |
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

## Known integration blockers (outside Module 4 ownership)

- Module 2's seeded instructor picker uses static `inst-1` IDs, not real Module 1 user IDs. Module 4 currently authorizes based on the current user's **instructor/admin role** rather than comparing `course.instructorId` with `actor.id`. Ask Module 2 to expose real instructor IDs for strict course-owner authorization.
- Module 2's course and enrollment arrays reset after a server restart. The original student may still view and download **their own prior attempts** after restart (because ownership is persisted), but re-enrollment in Module 2 is required before uploading another attempt. Coordinate durable enrollment separately with Module 2. Do not edit their module without team/admin approval.
- This patch cannot authenticate live accounts without a synchronized upstream that includes Module 1 and Better Auth (`bun install`).
- The storage patch must be merged via GitHub after a teammate review and actual Bun CI. At the time of package creation, GitHub remote writes are blocked for this assistant (HTTP 403) and Bun is not installed in this assistant's execution runtime.
