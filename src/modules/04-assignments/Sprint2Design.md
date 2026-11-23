# Module 4 Sprint 2 design {#mainpage}

## Scope and traceability

Sprint 1 introduced assignment creation, validation, course-filtered listing,
details, and deadline editing. Sprint 2 adds a sample-file submission form,
server-side upload validation, and a receipt that can be reopened or used
to retrieve the file.

## Sprint 2 ownership and acceptance checks

The Sprint 1 plan reserved M04-FR-006 through M04-FR-008 for submissions.
The IDs below are a proposed mapping for the demo. Confirm the official
wording and acceptance criteria in the collaborative SRS.

| Proposed requirement | Proposed owner | Acceptance check for the demo |
| -------------------- | -------------- | ----------------------------- |
| M04-FR-006 — Submit an assignment file | Ishaq | Open the upload form from assignment details and submit a sample file. The response redirects to a receipt for that assignment. |
| M04-FR-007 — Validate a submission | Abdul | Reject missing, empty, duplicate, oversized, and unsupported files without returning a receipt. |
| M04-FR-008 — View a receipt and retrieve the file | Lanna | Reopen the receipt and verify the filename, timestamp, and original bytes. The receipt is unavailable under a different assignment. |

These are proposed review and handoff responsibilities. The existing
implementation is in commit `d536f85`. Record individual contributions
from the commits or reviews each teammate completes.

## Application structure

```text
LMS browser
  -> Module 4 Elysia router
       -> Assignment lookup (existing in-memory assignment list)
       -> Submission store (validation, receipt, file bytes)
```

## Data model

```text
Assignment (1) -------------------------------- (0..*) Submission
  id (PK)                                    id (PK)
  courseId                                   assignmentId (logical FK)
  title                                      submittedAt (ISO 8601 UTC)
  description                                file (name and bytes)
  dueDate
```

The prototype uses a Map keyed by receipt ID. The router checks that the
assignment exists before accepting a file. A receipt lookup also checks
its assignment ID. There is no database or user identity on the submission
record. A restart clears the store.

## HTTP contract

All paths are relative to `/04-assignments`.

| Method | Path | Result |
| ------ | ---- | ------ |
| GET | /assignments/:id/submissions | 200 with upload form, or 404 |
| POST | /assignments/:id/submissions | 303 with receipt Location on success |
| GET | /assignments/:id/submissions/:receipt | 200 receipt HTML, or 404 |
| GET | /assignments/:id/submissions/:receipt/file | 200 file attachment, or 404 |

POST expects multipart/form-data with one file field named `file`.
An empty, missing, or duplicate file field returns 400. A file above 5 MiB
returns 413. A name without a .pdf or .txt extension returns 415. An unknown
assignment returns 404. A full prototype store returns 503. File type
validation uses the filename extension. Use generated sample files.

After a successful POST the client follows the 303 to the receipt GET.
Refreshing the receipt therefore does not repeat the POST.

## Verification

- Unit tests cover original bytes, timestamp, assignment scoping, validation,
  maximum file size, and capacity.
- Route integration tests use the normal LMS app, from assignment details
  to form, upload, receipt and download. They also cover rejection paths.
- Run `bun test ./src/modules/04-assignments/` for Module 4 and
  `bun run check` for the project regression suite.

## Integration work

Issue #12 tracks authenticated role and course authorization. Issue #13
tracks persistent assignment storage. Extend persistence to submission
records and bytes when a shared store is agreed. Submission history,
resubmission, late policies and accommodations still require implementation.
