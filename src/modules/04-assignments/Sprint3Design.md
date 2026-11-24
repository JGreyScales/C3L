# Module 4 Sprint 3 design

## Goal

By the Sprint 3 demo, an instructor creates an assignment, an enrolled student submits and
resubmits, and both attempts appear in the student's history with their on-time or late status.
Everything survives a server restart.

## Ownership

| Requirement | Owner | Where |
| ----------- | ----- | ----- |
| #13 Permanent storage | Ishaq | `db/` (SQLite via `bun:sqlite`, files in `data/uploads/`) |
| #12, M04-FR-006 Login and enrollment | Abdul | `integration.ts` (Modules 1 and 2) |
| M04-FR-009 Late tracking | Cheryl | `submissions.ts` (status per attempt) |
| M04-FR-010 Resubmission rules | Lanna | `submissions.ts` (limit), `attempts.ts` (display) |
| M04-FR-011 Submission history | Lanna | `attempts.ts`, history and all-students pages in `index.ts` |
| M04-FR-012 Deadline accommodations | Cheryl | `/assignments/:id/accommodations` |
| API for other modules | Lanna | `attempts.ts`, `notifications.ts`, `API.md` |

## Data model

```text
Assignment (1) ---------------- (0..*) Submission
  id (PK)                          id (PK)
  courseId   (Module 2 ID)         assignmentId (FK)
  title                            courseId
  description                      studentId        (Module 1 user ID)
  dueAt                            attemptNumber    (1, 2, 3 ...)
  maxAttempts (default 3)          fileName, sizeBytes, contentType
  createdBy  (Module 1 user ID)    filePath         (on the server's disk, never shared)
                                   submittedAt      (ISO 8601 UTC)
Assignment (1) ---- (0..*) Accommodation          effectiveDueAt (deadline used for this attempt)
  id (PK)                                          status ("on-time" | "late")
  assignmentId (FK), studentId
  extendedDueAt, reason, grantedBy
```

- `(assignmentId, studentId, attemptNumber)` is unique, so two uploads can't get the same number.
- One student has at most one accommodation per assignment.
- The database column is `dueAt`. The Sprint 1 HTML form still names its field `dueDate`, and
  that value is saved as `dueAt`.

## Resubmission rules (FR-010)

1. Every upload by the same student on the same assignment is a new attempt. Old attempts are
   never overwritten or deleted.
2. The attempt number is one more than that student's highest attempt on that assignment.
   Students are counted separately, and other assignments don't count.
3. The instructor sets `maxAttempts` when creating the assignment (1 to 50, default 3).
4. An upload past the limit gets `409 Conflict`, and nothing is saved. The limit is checked again
   inside the database transaction, so two uploads at the same moment can't both slip through.
5. A rejected upload (400, 409, 413, 415) doesn't use up an attempt.
6. The newest attempt is the **current** one. The gradebook API returns it.
7. Late attempts are allowed and are marked late (FR-009). There is no hard cut-off.
8. Each attempt keeps the deadline that applied when it was submitted (`effectiveDueAt`). If the
   instructor changes the due date later, earlier attempts keep their status.

## Submission history (FR-011)

| Page | Who | Shows |
| ---- | --- | ----- |
| `/assignments/:id/submissions/history` | Student | Their own attempts, newest first. The newest is marked **(current)**. Each attempt shows its file, time, on-time/late, its deadline and a download link. Shows attempts used and left, and the "Submit a new attempt" link only while attempts are left. |
| `/assignments/:id/submissions/all` | Instructor, admin | One row per student: attempts used, current file, time, on-time/late, links to that student's full history and a download. Shows how many current attempts are late. |
| `/assignments/:id/submissions/history?studentId=...` | Instructor, admin | One student's full history, with a link back to all students. |

An instructor who opens the history page without choosing a student is sent to the
all-students page. A student never sees another student's attempts. Instructors can still view
history, the all-students page and files after a course is archived; only changes are blocked.

## Submit flow

```text
Student uploads a file
  -> signed in? (Module 1 /api/me)                    no  -> 401
  -> enrolled in the course? (Module 2)                no  -> 403
  -> one file, not empty, PDF/TXT, 5 MB? (FR-007)      no  -> 400 / 413 / 415
  -> attempts left? (FR-010)                           no  -> 409
  -> effective deadline (FR-012) and status (FR-009)
  -> save the file and the submission (#13)
  -> 303 redirect to the receipt
```

## How Module 4 fits with other modules

```text
              we call                                     call us
 Module 1 Identity  --GET /api/me--------->  +-----------+  <--GET /api/assignments--------  Module 11 Calendar
 Module 2 Courses   --GET /api/courses---->  | Module 4  |  <--GET /api/assignments--------  Module 12 Dashboard
 Module 8 Notify    <-POST /api/.../events-  |Assignments|  <--GET /api/assignments/:id/sub.  Module 6 Gradebook
                                             +-----------+  <--GET /api/assignments/:id/sub.  Module 9 Analytics
```

- **Module 1** tells us who is signed in and their role.
- **Module 2** tells us who is enrolled in a course.
- **Module 8** gets an `assignment` event when an assignment is created, addressed to the
  course's enrolled students (`user_ids`). If Module 8 fails, the assignment is still created.
- **Modules 6, 9, 11, 12** read our JSON API. See `API.md`.

## Known limitations

- Only a course's own instructor (Module 2 `instructorId`) or an admin can manage it (#12).
  Module 2's instructor IDs are still demo values, not Module 1 user IDs, so until Module 2 stores
  real IDs a real instructor account is refused: use an admin account for the demo's instructor steps.
- Module 2's instructor IDs are demo values, not Module 1 user IDs, so any instructor or admin can
  manage any course's assignments. Strict course-owner checks need Module 2 to store real IDs.
- Module 2's enrollments reset when the server restarts. Students can still see their saved
  attempts, but must be re-enrolled before submitting again.
- File type is checked by extension only, not by the file's contents.
- The notification uses Module 8's course members. It doesn't send to a custom list of students.
