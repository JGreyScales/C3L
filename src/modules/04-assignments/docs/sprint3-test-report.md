# Sprint 3 — Module 4 Test Report (Assignments & Submissions)

**Module:** 04 — Assignment & Submission System
**Scope tested:** late tracking (FR-009), resubmission (FR-010), submission history (FR-011),
deadline accommodations (FR-012), persistent storage, and the Module 1 / Module 2 integration.
**Author:** Cheryl · **Date:** 2026-11-24

---

## 1. How to reproduce the automated evidence

From the repository root:

```
bun install                         # first time only
bun test src/modules/04-assignments # Module 4 suite
bun run check                       # lint + typecheck + all tests + module sanity (the CI gate)
```

Latest results on branch `feature/m04-sprint-3-accommodations`:

| Command | Result |
|---|---|
| `bun test src/modules/04-assignments` | **82 pass, 0 fail** (241 expect() calls, 13 files) |
| `bun run check` (whole project) | **267 pass, 0 fail**; all 12 modules OK |

Each row in the matrix below names the automated test that proves it, so a reviewer can run the
suite and see the same result. Screenshots for the live demo are captured with the runbook in §4.

---

## 2. Test matrix

| # | Test | Expected | Actual | Pass/Fail |
|---|------|----------|--------|-----------|
| 1 | Instructor creates an assignment | `201 Created` | 201; assignment persisted | ✅ Pass |
| 2 | Enrolled student submits before the deadline | Saved, status `on-time` | `on-time` stored | ✅ Pass |
| 3 | Student resubmits after the deadline | Attempt 2 saved, status `late` | `late`, attempt 2 | ✅ Pass |
| 4 | Submission history shows every attempt | Attempt 1 + Attempt 2 with on-time/late | both shown with status | ✅ Pass |
| 5 | Data survives a server restart | History + files + statuses intact | all intact after reopen | ✅ Pass |
| 6 | Submitted file downloads after restart | Original bytes + correct filename | bytes + filename match | ✅ Pass |
| 7 | A submission exactly at the deadline | `on-time` | `on-time` | ✅ Pass |
| 8 | A submission one second after the deadline | `late` | `late` | ✅ Pass |
| 9 | Late submission **with** an accommodation | `on-time` (uses extended deadline) | `on-time` | ✅ Pass |
| 10 | Earlier statuses unchanged after an accommodation | Old attempts keep their status | unchanged | ✅ Pass |
| 11 | Instructor grants, lists and removes an accommodation | Grant → shows in list → Remove clears it | works, list empty after remove | ✅ Pass |
| 12 | Student sees their **extended** deadline on the submit page | Extended date shown | shown as "Your due date" | ✅ Pass |
| 13 | Accommodation **reason** hidden from the student | Reason not on student pages | not present | ✅ Pass |
| 14 | A student cannot remove an accommodation | `403` | `403` | ✅ Pass |
| 15 | Not signed in tries to submit | `401` | `401` | ✅ Pass |
| 16 | Signed-in non-enrolled / wrong-role user submits | `403` | `403` | ✅ Pass |
| 17 | Student exceeds `maxAttempts` (3) | `409` | `409` | ✅ Pass |
| 18 | Another student opens your receipt / downloads your file | `403` | `403` on both | ✅ Pass |

### Where each row is proven (automated tests)

- Rows 1, 15, 16 — `sprint3.integration.test.ts` › *authentication and actual course enrollment are required*
- Rows 2–6, 9, 10, 17, 18 — `sprint3.integration.test.ts` › *create → on-time → resubmit late → restart → history and file survive → accommodation*
- Rows 2, 3, 7, 8, 9 — `late-tracking.test.ts` (pure late-status logic + real stored submissions)
- Rows 11, 12, 13, 14 — `accommodations.test.ts`
- Row 17 also — `submissions.test.ts` › *limits attempts per student*

---

## 3. Notes / known limitations (carried into the release notes)

- **Instructor-of-this-course ownership is not enforced yet.** Any `instructor` account can manage any
  course, because Module 2 still uses hard-coded demo instructor IDs (`inst-1`) rather than Module 1
  user IDs. Role-based control works; course-ownership needs a Module 2 contract. (Tracked for Abdul.)
- **Module 2 enrollments reset on server restart** (its course list is in memory). A student keeps
  access to work they already submitted, but must be re-enrolled before submitting a *new* attempt.
- Statuses are a **snapshot**: each submission stores the `effectiveDueAt` and on-time/late value it
  had when it was made, so granting an accommodation later never rewrites past attempts.

---

## 4. Live demo runbook (for the screenshots)

> Drop captured images in `src/modules/04-assignments/docs/images/` using the filenames below and
> they will render in this report.

**Start the app**

```
bun install
bun src/modules/04-assignments/db/seed.ts   # optional: adds a demo assignment due in 24h
bun run dev                                  # http://localhost:3000
```

**Accounts (Module 1 — the FIRST account registered becomes the admin)**

1. Open `/01-identity-users` and register account **#1** → it is the **admin**.
2. Register account **#2** (the instructor-to-be) and account **#3** (the student). Both start as
   `student`.
3. As the **admin**, use the Module 1 admin tools (user list → change role, or
   `PUT /01-identity-users/api/users/:id/role` with `{"role":"instructor"}`) to make account **#2** an
   `instructor`. (Each user's id is on `/01-identity-users/api/me` while signed in, or in the admin
   user list.)

**Enrollment (Module 2)**

4. Open `/02-courses/enroll` and enroll the **student's id** (account #3) into course **1 — PROG2020**.

**The flow (screenshots)**

| Screenshot file | Signed in as | Step |
|---|---|---|
| `s3-01-create-assignment.png` | instructor | `/04-assignments` → create an assignment in course 1 with a due date |
| `s3-02-accommodation-grant.png` | instructor | Assignment → **Grant accommodation** → give the student a later due date + reason |
| `s3-03-accommodation-list.png` | instructor | Accommodations page showing the entry **and the Remove button** |
| `s3-04-submit-extended-deadline.png` | student | Assignment → **Submit** → page shows **"Your due date"** (the extension), not the reason |
| `s3-05-receipt-ontime.png` | student | Submit a PDF/TXT → receipt shows **on-time** |
| `s3-06-history-ontime-late.png` | student | (instructor lowers the due date, student resubmits) → **history shows Attempt 1 on-time, Attempt 2 late** |
| `s3-07-after-restart.png` | student | Stop and restart `bun run dev`, reopen history → **both attempts still there** |
| `s3-08-not-enrolled-403.png` | other student | Open the submit URL while not enrolled → **403** |
| `s3-09-not-signed-in-401.png` | (signed out) | Open the submit URL → **401** |
| `s3-10-attempt-limit-409.png` | student | Submit a 4th time (limit 3) → **409** |
| `s3-11-tests-pass.png` | — | Terminal screenshot of `bun run check` (267 pass, 0 fail) |

If a page shows "Course not found" when Module 1 or 2 is not running, start all three modules with a
single `bun run dev` (they are mounted in the same app).
