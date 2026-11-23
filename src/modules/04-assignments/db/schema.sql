-- Module 4 (Assignments & Submissions) — agreed Sprint 3 data model.
-- IDs belonging to Modules 1 and 2 are stored as text, with no cross-module FK.

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  courseId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  dueAt TEXT NOT NULL,
  maxAttempts INTEGER NOT NULL DEFAULT 3 CHECK (maxAttempts >= 1),
  createdBy TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_m04_assignments_course
  ON assignments (courseId);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignmentId TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  courseId TEXT NOT NULL,
  studentId TEXT NOT NULL,
  attemptNumber INTEGER NOT NULL CHECK (attemptNumber >= 1),
  fileName TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL CHECK (sizeBytes > 0),
  contentType TEXT NOT NULL,
  filePath TEXT NOT NULL,
  submittedAt TEXT NOT NULL,
  effectiveDueAt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('on-time', 'late')),
  UNIQUE (assignmentId, studentId, attemptNumber)
);

CREATE INDEX IF NOT EXISTS idx_m04_attempt_history
  ON submissions (assignmentId, studentId, attemptNumber);

CREATE TABLE IF NOT EXISTS accommodations (
  id TEXT PRIMARY KEY,
  assignmentId TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  studentId TEXT NOT NULL,
  extendedDueAt TEXT NOT NULL,
  reason TEXT NOT NULL,
  grantedBy TEXT NOT NULL,
  UNIQUE (assignmentId, studentId)
);
