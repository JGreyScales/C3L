# Module 4 — Assignments & Submissions API

Base path: `/04-assignments`

Other modules use this API to show deadlines (Calendar, Dashboard) and to read each student's
current submission (Gradebook, Analytics). Every endpoint returns JSON and uses the caller's
Module 1 login cookie. Call it from the browser session, or forward the `cookie` header when
calling the router in-process.

## `GET /api/assignments?courseId=<courseId>`

One course's assignments, earliest due date first.

- **Who:** an instructor, an admin, or a student enrolled in the course. Archived courses can
  still be read.
- **Used by:** Module 11 (Calendar), Module 12 (Dashboard).

```json
{
  "courseId": "1",
  "assignments": [
    {
      "id": "6f1c0c8e-2a7d-4c3e-9a51-0b7e6d1f2a90",
      "courseId": "1",
      "title": "Design Sprint 3",
      "description": "Submit a PDF or TXT file.",
      "dueAt": "2026-11-27T23:59:00-05:00",
      "maxAttempts": 3
    }
  ]
}
```

- `courseId` is Module 2's course **ID** (for example `1`), not the course code.
- `dueAt` is ISO 8601 with a time-zone offset (Toronto time).

| Status | When |
| ------ | ---- |
| 400 | `courseId` is missing |
| 401 | Not signed in |
| 403 | Not the instructor, an admin, or an enrolled student |
| 404 | Module 2 has no course with that ID |

## `GET /api/assignments/:id/submissions`

Submissions for one assignment. What you get depends on who is asking.

**Instructor or admin, no `studentId`:** each student's **current** (newest) attempt.
Used by Module 6 (Gradebook) and Module 9 (Analytics).

```json
{
  "assignmentId": "6f1c0c8e-2a7d-4c3e-9a51-0b7e6d1f2a90",
  "maxAttempts": 3,
  "submissions": [
    {
      "id": "48d9b660-8ef2-4131-ba48-46c9dacb92fa",
      "assignmentId": "6f1c0c8e-2a7d-4c3e-9a51-0b7e6d1f2a90",
      "courseId": "1",
      "studentId": "student-42",
      "attemptNumber": 2,
      "attemptCount": 2,
      "fileName": "final.pdf",
      "sizeBytes": 18234,
      "contentType": "application/pdf",
      "submittedAt": "2026-11-28T05:14:09.000Z",
      "effectiveDueAt": "2026-11-27T23:59:00-05:00",
      "status": "late"
    }
  ]
}
```

**Instructor or admin with `?studentId=...`, or any student:** every attempt by that one student,
oldest first. A student always gets their own attempts, whatever `studentId` they pass.

```json
{
  "assignmentId": "6f1c0c8e-2a7d-4c3e-9a51-0b7e6d1f2a90",
  "studentId": "student-42",
  "maxAttempts": 3,
  "submissions": [ { "attemptNumber": 1, "status": "on-time" }, { "attemptNumber": 2, "status": "late" } ]
}
```

(Each submission has the same fields as above, without `attemptCount`.)

- `status` is `"on-time"` or `"late"`, compared with `effectiveDueAt`: the student's extended
  deadline if they have an accommodation, otherwise the assignment's due date when they submitted.
- Students who never submitted are not listed. Compare with Module 2's `enrollments` to find them.
- The server file path is never included. Download a file from
  `/04-assignments/assignments/:id/submissions/:submissionId/file`.

| Status | When |
| ------ | ---- |
| 401 | Not signed in |
| 403 | Not the instructor, an admin, or a student in the course |
| 404 | No assignment with that ID |

## Event Module 4 sends

### New assignment → Module 8

When an instructor creates an assignment, Module 4 sends
`POST /08-notifications/api/notifications/events`:

```json
{
  "event_type": "assignment",
  "course_id": "1",
  "user_ids": ["student-42", "student-43"],
  "content": {
    "subject": "New assignment: Design Sprint 3",
    "message": "Design Sprint 3 is due Fri, Nov 27, 2026, 11:59 PM EST."
  }
}
```

- `user_ids` is the course's enrolled students from Module 2, so the notification reaches the
  real class, not Module 8's demo member list.
- Long titles are shortened to fit Module 8's limits (subject 50 characters, message 280).
- If Module 8 is down or refuses the event, the assignment is still created and the error is
  logged.

## Modules Module 4 calls

| Module | Endpoint | Why |
| ------ | -------- | --- |
| 1 Identity | `GET /01-identity-users/api/me` | Who is signed in, and their role |
| 2 Courses | `GET /02-courses/api/courses` | Who is enrolled in a course |
| 8 Notifications | `POST /08-notifications/api/notifications/events` | Tell students about a new assignment |

All three are called in-process through each module's router (`integration.ts`, `notifications.ts`).
No other team's files are changed.
