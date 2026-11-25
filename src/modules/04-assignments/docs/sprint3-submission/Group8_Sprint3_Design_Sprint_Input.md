# Group 8 — Module 4 — Sprint 3 Design Sprint Input

**Course:** CSCN73030 Project V — Advanced Software Development Tools  
**Team:** T4chnical (Ishaq, Abdul, Lanna, Cheryl)  
**Repository:** https://github.com/Ameer-sys/C3L  
**Service:** Assignment & Submission System (Module 4)

## Step #1 — Fixes / Enhancements
- Replace Sprint 1–2 in-memory assignment and submission data with persistent SQLite and disk-based uploads: **issue #13 / PR #16**.
- Integrate identity and enrollment checks from Modules 1 and 2 and improve dependency failure handling: **issue #12 / PR #16 plus subsequent integration fixes**.
- Maintain existing assignment creation, field validation, list/details and due-date editing regressions (**#1–#5**). Make archived-course history readable while prohibiting edits and new submissions (review fixes in **PR #16**).
- Fix original download filename and guard access to receipts/files. Hide instructor-only controls from student pages; sort mixed time-zone deadlines chronologically.
- Track incomplete cross-module dependencies with five follow-up GitHub issues (numbers pending creation by Abdul): real instructor IDs, persistent course enrollments, notification delivery, downstream API adoption, and file-content validation.
- Integration sequence completed in team fork: PR **#16**, then **#17** and **#18**. Class repository integration PR is still required.

## Step #2 — New Functionality
- **M04-FR-009 / #21 (Cheryl):** Determine and save on-time/late status per submission, comparing the received time with the effective deadline.
- **M04-FR-010 / #22 (Lanna):** Resubmit up to the configured `maxAttempts` (default 3); preserve all attempts, show current attempt and attempts remaining.
- **M04-FR-011 / #23 (Lanna):** Student history (newest first), instructor all-students overview, receipts/downloads, JSON APIs for Calendar/Dashboard/Gradebook/Analytics.
- **M04-FR-012 / #24 (Cheryl):** Grant/list/remove individual deadline accommodations; show the student the extended deadline without exposing the private reason.
- **Issue #13 (Ishaq):** SQLite assignments/submissions/accommodations tables plus on-disk PDF/TXT uploads; saved rows/bytes remain after restart.
- **Issue #12 (Team integration):** Module 1 login/roles and Module 2 enrollments/ownership; admin used for teacher steps until Module 2 supports real IDs.
- **Module 8 integration (Lanna):** New-assignment event sent to notifications service; downstream recipient integration requires validation.
- **Quality evidence:** Team report documents 82 Module 4 tests / 267 whole-repo tests on Cheryl's feature branch; slide deck reports 136 Module 4 tests in final combined version. Final count to be confirmed by re-running checks on fork `main`.

## Required hand-in and traceability
- Completed Design Sprint Input PDF and Software Release Note PDF.
- Fresh ZIP containing **Doxygen-generated HTML** from the final integrated `main` commit (not the old Sprint 1/2 archive).
- Verify issue numbers and collaborative SRS mappings for Sprint 3; record full source commit, tag and test evidence.
- Team-fork `main` must be reviewed and submitted via a PR to `JGreyScales/C3L:main`.
