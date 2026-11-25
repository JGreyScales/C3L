# Sprint 3 — Module 4 Release Notes

## Service information
- **Service name:** Module 4 — Assignment & Submission System (C3L)
- **Team:** Group 8 / T4chnical (Ishaq, Abdul, Lanna, Cheryl)
- **Team repository:** https://github.com/Ameer-sys/C3L
- **Class repository:** https://github.com/JGreyScales/C3L
- **Release branch:** `main` in the team fork, after all Sprint 3 PRs have merged.
- **Proposed release tag:** `m04-sprint3-v1.0` — **NOT VERIFIED CREATED**. Create it on the final `main` commit after the documentation PR merges. Do not claim that the tag exists until verified in GitHub Releases.
- **Team integration PRs:** #16 (storage), #17 (history/API), #18 (accommodations/tests) — merged. PR #17 was merged with a feature-branch base; its principal files (`attempts.ts`, `API.md`, `Sprint3Design.md`) are present on current fork `main`.
- **Class integration:** Class-repository PR remains to be opened and approved. Team-fork merge alone is not a class-repository release.

## Issues fixed / completed functionality
- **#13** — Replace temporary assignment/submission storage with SQLite and disk-backed uploads (PR #16).
- **#12** — Integrate Module 1 login and Module 2 course data/authorization checks; handles failed module dependencies (team integration).
- **#21 / M04-FR-009** — Determine and persist on-time/late status per attempt.
- **#22 / M04-FR-010** — Support resubmissions up to an instructor-configured maximum (default three), preserving old attempts.
- **#23 / M04-FR-011** — Student submission history, instructor overview, and data APIs.
- **#24 / M04-FR-012** — Grant/list/remove deadline accommodations.
- Existing Sprint 1/2 functionality remains covered: #1 creation, #2 validation, #3 course list, #4 details, #5 deadline management; Sprint 2 upload workflow in PR #14 and testing evidence in PR #15.

## Known issues / follow-up issues — assign numbers before final submission
These are **five proposed follow-up tickets** grounded in existing integration limitations. Abdul should create the actual GitHub issues and supply each number; do not invent issue numbers.
1. **Issue #____:** Module 2 uses demo instructor IDs. It must use Module 1 user IDs so real assigned instructors can pass Module 4's course-ownership check.
2. **Issue #____:** Module 2 course enrollments are in memory and reset on application restart; persist memberships so students do not need re-enrollment.
3. **Issue #____:** Complete/verify end-to-end Module 8 notification delivery using real authenticated recipients and course enrollment data.
4. **Issue #____:** Integrate and verify Module 4's read-only assignment and submission APIs with Calendar (11), Dashboard (12), Gradebook (6), and Analytics (9).
5. **Issue #____:** Strengthen uploaded-file validation beyond filename extension (for example content signature and MIME checking).

## New functionality and quick start
- SQLite stores assignments, submissions, and accommodations in `src/modules/04-assignments/data/assignments.db` by default; uploaded PDF/TXT bytes live under `data/uploads/`, with randomized names. Both paths are excluded from Git.
- `bun:sqlite` initializes the tables in `db/schema.sql`; `db/repository.ts` reads/writes records. Server restarts preserve Module 4 data as long as the `data/` directory is kept.
- Assignments store course ID, title, description, due date, `maxAttempts`, and creator. Submissions store assignment/student IDs, attempt number, timestamp, saved-file path, effective deadline, and on-time/late status. Accommodations store the student's extended deadline and grant information.
- Each uploaded file is validated for size (5 MB maximum), supported extension (PDF/TXT), enrollment, login, and available attempts. Uploaded bytes are saved to disk, with a transaction for the submission row; failed SQL writes trigger file cleanup.
- Archived courses allow authorized reading of saved history/receipts and prohibit new changes/uploads.
- To run: `bun install` then `bun run dev`; open `http://localhost:3000/04-assignments/`. Register a Module 1 admin and student, enroll the real student ID using Module 2, and use admin for assignment-management steps until Module 2 supports real instructor IDs.
- Create "Lab 4" with `maxAttempts=3`; sign in as the enrolled student to upload `draft.txt`, then `final.txt`; open history; restart the app and confirm records and downloads remain. After restart re-enroll before a *new* upload because Module 2 state resets.
- Module 4 exposes assignment/attempt JSON for downstream modules. Refer to `API.md`, `Sprint3Design.md`, and `SPRINT3_README.md` for endpoint and data-model details.

## Record of regression testing and evidence
- **Repository test report:** `src/modules/04-assignments/docs/sprint3-test-report.md` records **82 Module 4 tests passed / 0 failed** and **267 total tests passed / 0 failed** on `feature/m04-sprint-3-accommodations`, with all 12 modules OK. These are documented branch results, not independently rerun for this package.
- **Final slide deck:** `Group_8_M4_S3.pdf`, slide 14, reports **136 Module 4 automated checks passed** in the final combined build. Rerun the latest fork `main` to validate this final count before copying it into a final release claim.
- Tests cover persistence after reopening SQLite, uploads/downloads, resubmissions, 3-attempt limit (409), late/on-time boundaries, accommodations, archived-course access, authorization (401/403), and role/enrollment integrations.
- Run from the final `main`: `bun test src/modules/04-assignments/` then `bun run check`. Save screenshots of the results and live demo, and note the exact commit/tag used. Update test counts here if the final `main` run differs.
- Evidence: GitHub PRs #16/#17/#18, `docs/sprint3-test-report.md`, tests under `src/modules/04-assignments/`, Doxygen-generated HTML ZIP (must be regenerated and attached separately).

## Release/hand-off conditions
- [ ] Five follow-up issue numbers inserted above and verified in GitHub.
- [ ] Updated documentation merged into team-fork `main`.
- [ ] Final `main` tests rerun; exact counts recorded.
- [ ] Tag `m04-sprint3-v1.0` created on the final team-fork `main` commit.
- [ ] Fresh Doxygen HTML ZIP generated from that commit.
- [ ] Team-fork `main` opened as a PR to `JGreyScales/C3L:main` and accepted.
