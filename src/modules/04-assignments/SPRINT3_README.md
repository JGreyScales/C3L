# Module 4 — Sprint 3 Integration & Demo (Final Team-Fork Candidate)

## Current status
- Sprint 3 PRs **#16 (storage), #17 (history/APIs) and #18 (accommodations/tests) have been merged** in the team fork.
- The merged Module 4 feature set is present on team-fork `main`. The PR into class repository `JGreyScales/C3L` is still pending.
- Proposed tag: `m04-sprint3-v1.0`; **create only after the final documentation and code are committed to `main`**.
- Known follow-ups, test evidence and release requirements: `RELEASE_NOTES_SPRINT3.md` and `docs/sprint3-test-report.md`.

## Storage and permissions
- Persistent SQLite in `data/assignments.db`; PDF/TXT bytes in `data/uploads/`. Both ignored by Git.
- SQLite tables: assignments, submissions and accommodations, with foreign keys and per-student unique attempt numbers.
- On-time/late status uses the effective deadline at upload time; earlier attempts are not rewritten after due-date changes.
- Module 1 authenticates actors; Module 2 provides course enrollments and instructor assignments.
- Only an administrator or the course's assigned instructor can manage active-course assignments. **Module 2 currently uses demo instructor IDs**, so use an admin account for the classroom demo.
- Students can submit only to an active course in which they are enrolled, and may see/download only their own files. Instructors/admins may view historic submissions after a course is archived; changes are blocked.
- Course enrollments in Module 2 reset on restart; re-enroll the student before another new submission.

## Development and verification
```bash
bun install
bun test src/modules/04-assignments/
bun run check
bun run dev
```

## Main routes (base: /04-assignments)
- `/` — landing page.
- `/assignments?courseId=1` — assignment list for Module 2's course ID 1.
- `/assignments/new` — create assignment (admin/authorized instructor).
- `/assignments/:id/due-date` — change deadline (authorized instructor/admin).
- `/assignments/:id/accommodations` — grant/list/remove student extensions.
- `/assignments/:id/submissions` — enrolled-student upload.
- `/assignments/:id/submissions/history` — student attempts / instructor's selected student.
- `/assignments/:id/submissions/all` — instructor overview.
- `/assignments/:id/submissions/:receipt` and `.../:receipt/file` — receipt/download.
- `/api/assignments?courseId=1` and `/api/assignments/:id/submissions` — JSON integration endpoints; details in `API.md`.

## Acceptance demo
1. Launch `bun run dev`, sign in as the Module 1 admin, and verify course `1` in Module 2.
2. Register and enroll a student using their real Module 1 **user ID** at `/02-courses/enroll`.
3. As admin, create **Lab 4** (maximum three attempts, future due date).
4. Sign in as student, upload `draft.txt`; verify receipt and Attempt 1.
5. Upload `final.txt`; verify Attempt 2 of 3 and history with both files.
6. Stop and restart `bun run dev` without deleting `data/`; sign in and show the saved assignment/history/downloads.
7. Re-enroll the student in Module 2 before any further attempt; as admin show the instructor overview.
8. Optional: adjust due date and grant/remove an accommodation; show on-time/late status as saved per attempt.

## Submission artifacts
- Complete official **Design Sprint Input PDF** (Step 1 Fixes/Enhancements; Step 2 New Functionality).
- Complete official **Software Release Note PDF** (Service Name; GitHub Branch/Repo/Tag; Fixed Issues; Known Issues; New Functionality; Regression Tests).
- Fresh Doxygen HTML ZIP generated from the final fork `main`.
- Updated collaborative SRS/issues/project board as required; final class-repository PR.
