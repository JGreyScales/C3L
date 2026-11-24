# Module 4 SRS: Sprint 3 updates

These are the Sprint 3 changes to the team SRS for Module 4 (Assignments and Submissions).
Each rule is written from the merged code (PRs #16, #17, #18 and #12), so the SRS matches what
the system really does. Rule numbers match `Sprint3Design.md`.

## Summary

| ID | Requirement | Sprint 3 status |
| -- | ----------- | --------------- |
| M04-FR-006 | Submit an assignment file | **Fully met**: only an enrolled student can submit, and each attempt stores their Module 1 id |
| M04-FR-009 | Late submission tracking | Met (PR #16, #18) |
| M04-FR-010 | Resubmission rules | Met (PR #16, #17) |
| M04-FR-011 | Submission history | Met (PR #17) |
| M04-FR-012 | Deadline accommodations | Met (PR #16, #18) |
| M04-FR-013 | Submission receipt and file download | **New** (added as the team agreed) and met |

## M04-FR-006: Submit an assignment file (fully met)

The system shall let a signed-in student who is enrolled in the assignment's course upload one
file (PDF or TXT, up to 5 MB) as an attempt.

1. Not signed in (Module 1 says 401): **401** with a link to the Module 1 sign-in page.
2. Signed in but not a student, or not in the course's `enrollments` (Module 2): **403**.
3. Archived course: **403**; saved work can still be read.
4. Each saved attempt stores `studentId` (the Module 1 user id) and `courseId`.
5. Module 1 or 2 not responding: **503** naming the module. Nothing is saved.

## M04-FR-009: Late submission tracking

1. Each attempt's deadline (`effectiveDueAt`) is the student's accommodation `extendedDueAt` if
   they have one for this assignment, otherwise the assignment's `dueAt`.
2. An attempt is `on-time` if it was submitted at or before `effectiveDueAt` (exactly on the
   deadline counts as on time), otherwise `late`. Times are compared as exact moments (UTC).
3. Late attempts are accepted and marked late. There is no hard cut-off.
4. The status and `effectiveDueAt` are saved with the attempt and never recalculated. A later
   due-date change or accommodation change does not alter earlier attempts.
5. The status shows on the receipt, the student's history and the instructor's overview.

## M04-FR-010: Resubmission rules

1. Every upload by the same student on the same assignment is a new attempt. Earlier attempts
   are never overwritten or deleted.
2. `attemptNumber` = that student's highest attempt number on that assignment + 1.
3. The instructor sets `maxAttempts` when creating the assignment (1 to 50, default 3).
4. An upload past the limit gets **409** and nothing is saved. The check is repeated inside the
   database transaction, so two uploads at the same moment cannot both get through.
5. A rejected upload (400, 409, 413, 415) does not use up an attempt.
6. The newest attempt is the **current** one. That is the one the Gradebook API returns.

## M04-FR-011: Submission history

1. A student sees only their own attempts, newest first, with the current one marked. Each row
   shows the file, time, deadline used, on-time/late status and a download link. The page shows
   attempts used and left, and the "Submit a new attempt" link only appears while attempts are left.
2. The course's own instructor (or an admin) sees an overview with one row per student (current
   file, time, status, attempts used), with links to each student's full history.
3. A student never sees another student's attempts. If they ask for one, they get their own.
4. History, files and statuses survive a server restart (SQLite plus files on disk).
5. Instructors can still view history for an archived course.

## M04-FR-012: Deadline accommodations

1. Only the course's own instructor or an admin can grant, list or remove accommodations
   (**401** if not signed in, **403** otherwise, **403** for an archived course).
2. An accommodation is for one enrolled student on one assignment. A student not in the course's
   enrollments gets **400**.
3. `extendedDueAt` must be a valid date after the assignment's `dueAt` (otherwise **400**).
4. `reason` is required, up to 500 characters. `grantedBy` is the instructor's Module 1 id.
5. A student has at most one accommodation per assignment. Granting again replaces it.
6. The instructor can remove an accommodation. The student goes back to the class deadline.
7. The student sees their own extended deadline on the submit page. The reason is shown to
   instructors only.
8. Changes affect only attempts made afterwards (FR-009 rule 4).

## M04-FR-013: Submission receipt and file download (new)

The system shall show a receipt for each saved attempt (receipt id, attempt number, file name,
size, time, deadline used, on-time/late) and let the user download the original file.

1. Only the student who submitted, the course's own instructor, or an admin can open a receipt or
   download a file (**401** if not signed in, **403** for anyone else, including classmates).
2. A receipt is only found under its own assignment. Anywhere else it gives **404**.
3. The download returns exactly the bytes uploaded, as an attachment with the original file name.
4. Files are only served from Module 4's own uploads folder.

## Access rules (#12)

| Action | Who may do it |
| ------ | ------------- |
| Create assignment, change due date, grant or remove accommodations | The course's own instructor (Module 2 `instructorId`) or an admin |
| Submit an attempt | A signed-in student enrolled in the course (Module 2 `enrollments`) |
| Receipt, download, own history | The student who submitted, the course instructor or an admin |
| All-students overview, Gradebook API for all students | The course instructor or an admin |
| Calendar/Dashboard API | Anyone enrolled in the course, the course instructor or an admin |
| List and details pages | Anyone; instructor links only show for the course instructor |

**401** = not signed in, **403** = not allowed, **503** = Module 1 or 2 not responding.

## Dependencies on other modules

### Modules that Module 4 uses

| Module | What we use | Code | If it fails |
| ------ | ----------- | ---- | ----------- |
| 1 Identity & Users | `GET /api/me`, forwarding the request's cookie: user `id`, `name`, `role` (student, instructor or admin). 401 means not signed in. | `integration.ts` `currentActor` | 503 "Module 1 (login) is not responding" |
| 2 Courses | `GET /api/courses`: each course's `id`, `code`, `enrollments` (student ids), `instructorId`, `archived` | `integration.ts` `findCourse` | 503 "Module 2 (courses) is not responding" |
| 8 Notifications | `POST` an `assignment` event to the course's enrolled students when an assignment is created | `notifications.ts` | The assignment is still created; the notification is skipped |

Requirements we place on them:

- Module 2's `instructorId` and `enrollments` must hold **Module 1 user ids**. Today Module 2's
  instructor dropdown uses demo ids (`inst-1` to `inst-3`), so a real instructor account is
  refused. Until Module 2 changes this, an **admin** account must do the instructor steps.
- Module 2's enrollments are kept in memory and reset on restart. Saved attempts stay readable,
  but students must be enrolled again before they can submit.

### Modules that use Module 4

| Module | What they read | Endpoint |
| ------ | -------------- | -------- |
| 6 Gradebook | Each student's current attempt, status and attempt count | `GET /04-assignments/api/assignments/:id/submissions` |
| 9 Analytics | The same per-student summary (on-time vs late, attempts) | `GET /04-assignments/api/assignments/:id/submissions` |
| 11 Calendar | A course's assignments and due dates | `GET /04-assignments/api/assignments?courseId=` |
| 12 Dashboard | A course's assignments and due dates | `GET /04-assignments/api/assignments?courseId=` |

Full request and response details are in `API.md`.
