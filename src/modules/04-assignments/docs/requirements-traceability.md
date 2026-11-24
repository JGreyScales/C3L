# Module 4 requirements traceability

Each requirement is listed with its owner, code, tests, pull request and status. When a PR
merges, set its row to **Done**.

## Sprint 3

| Requirement | Owner | Code | Tests | PR | Status |
| ----------- | ----- | ---- | ----- | -- | ------ |
| #12 Login and enrollment (Modules 1 and 2) | Abdul | `integration.ts` (`currentActor`, `findCourse`, `canSubmit`, `canManage`, `canViewHistory`), `gate()` in `index.ts` | `access.routes.test.ts`, `sprint3.integration.test.ts`, `sprint3.review.test.ts` | #16, #? (strict instructor check, 503) | In progress |
| M04-FR-006 Submit a file (`studentId` saved, enrolled students only) | Ishaq / Abdul | `submissions.ts`, `index.ts` POST `/assignments/:id/submissions` | `submissions.test.ts`, `submission.routes.test.ts`, `access.routes.test.ts` | #16, #? | Fully met when #? merges |
| M04-FR-009 Late tracking | Cheryl | `lateness.ts`, `submissions.ts` | `late-tracking.test.ts`, `sprint3.integration.test.ts` | #16, #18 | Done |
| M04-FR-010 Resubmission rules | Lanna | `submissions.ts` (limit), `attempts.ts` (display) | `history.routes.test.ts`, `sprint3.integration.test.ts` | #16, #17 | Done (#17 still needs to reach `main`) |
| M04-FR-011 Submission history | Lanna | `attempts.ts`, history and all-students pages in `index.ts` | `history.routes.test.ts` | #17 | Done (#17 still needs to reach `main`) |
| M04-FR-012 Deadline accommodations | Cheryl | `/assignments/:id/accommodations` in `index.ts`, `db/repository.ts` | `accommodations.test.ts`, `access.routes.test.ts` | #16, #18 | Done |
| M04-FR-013 Receipt and download | Lanna (Sprint 2) / Abdul (access) | `index.ts` GET `/assignments/:id/submissions/:receipt` and `/file` | `submission.routes.test.ts`, `access.routes.test.ts` | #14, #16, #? | In progress |
| Persistent storage (SQLite and files) | Ishaq | `db/database.ts`, `db/repository.ts`, `db/uploads.ts` | `db/database.test.ts`, `sprint3.integration.test.ts` | #16 (issue #13) | Done |
| APIs for Modules 6, 9, 11, 12 and Module 8 notification | Lanna | `index.ts` `/api/...`, `notifications.ts`, `API.md` | `history.routes.test.ts` | #17 | Done (#17 still needs to reach `main`) |

## Earlier sprints

| Requirement | Owner | Code | Tests | PR | Status |
| ----------- | ----- | ---- | ----- | -- | ------ |
| M04-FR-001 Create assignment | Abdul | `createAssignment.ts`, `index.ts` | `createAssignment.test.ts`, `createAssignment.routes.test.ts` | Sprint 1 | Done |
| M04-FR-002 Validate assignment fields | Abdul | `createAssignment.ts` | `createAssignment.test.ts` | Sprint 1 | Done |
| M04-FR-003 List course assignments | Team | `assignments.ts`, `index.ts` | `assignments.test.ts` | Sprint 1, #11 | Done |
| M04-FR-004 Assignment details | Team | `index.ts` | `assignment-details.test.ts` | Sprint 1 | Done |
| M04-FR-005 Due date | Team | `dueDate.ts`, `index.ts` | `dueDate.test.ts`, `dueDate.routes.test.ts` | Sprint 1 | Done |
| M04-FR-007 Validate a submission | Abdul | `submissions.ts` | `submissions.test.ts`, `submission.routes.test.ts` | #14 | Done |
| M04-FR-008 Submission receipt | Lanna | `index.ts` | `submission.routes.test.ts` | #14 | Done (continued as FR-013) |
