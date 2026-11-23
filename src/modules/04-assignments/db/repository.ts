import type { Database } from 'bun:sqlite'

// Shared Sprint 3 contract: change these interfaces only with team agreement.
export interface AssignmentRecord {
  id: string
  courseId: string
  title: string
  description: string
  dueAt: string
  maxAttempts: number
  createdBy: string
}

export interface SubmissionRecord {
  id: string
  assignmentId: string
  courseId: string
  studentId: string
  attemptNumber: number
  fileName: string
  sizeBytes: number
  contentType: string
  filePath: string
  submittedAt: string
  effectiveDueAt: string
  status: 'on-time' | 'late'
}

export interface AccommodationRecord {
  id: string
  assignmentId: string
  studentId: string
  extendedDueAt: string
  reason: string
  grantedBy: string
}

/** Inserts a new assignment or persists an instructor's edits. */
export function saveAssignment(database: Database, assignment: AssignmentRecord): void {
  database.query(`
    INSERT INTO assignments (id, courseId, title, description, dueAt, maxAttempts, createdBy)
    VALUES ($id, $courseId, $title, $description, $dueAt, $maxAttempts, $createdBy)
    ON CONFLICT(id) DO UPDATE SET
      courseId = excluded.courseId,
      title = excluded.title,
      description = excluded.description,
      dueAt = excluded.dueAt,
      maxAttempts = excluded.maxAttempts,
      createdBy = excluded.createdBy
  `).run({
    $id: assignment.id,
    $courseId: assignment.courseId,
    $title: assignment.title,
    $description: assignment.description,
    $dueAt: assignment.dueAt,
    $maxAttempts: assignment.maxAttempts,
    $createdBy: assignment.createdBy,
  })
}

export function getAssignment(database: Database, id: string): AssignmentRecord | undefined {
  const row = database.query('SELECT * FROM assignments WHERE id = ?').get(id) as
    | AssignmentRecord
    | null
  return row ?? undefined
}

export function listAssignments(database: Database, courseId: string): AssignmentRecord[] {
  if (!courseId.trim()) return []
  return database.query('SELECT * FROM assignments WHERE courseId = ? ORDER BY dueAt, id')
    .all(courseId) as AssignmentRecord[]
}

/** Attempt numbers must be unique for each student and assignment. */
export function nextAttemptNumber(
  database: Database,
  assignmentId: string,
  studentId: string,
): number {
  const row = database.query(`
    SELECT COALESCE(MAX(attemptNumber), 0) + 1 AS nextAttempt
    FROM submissions WHERE assignmentId = ? AND studentId = ?
  `).get(assignmentId, studentId) as { nextAttempt: number }
  return row.nextAttempt
}

export function saveSubmission(database: Database, submission: SubmissionRecord): void {
  database.query(`
    INSERT INTO submissions (
      id, assignmentId, courseId, studentId, attemptNumber,
      fileName, sizeBytes, contentType, filePath, submittedAt, effectiveDueAt, status
    ) VALUES (
      $id, $assignmentId, $courseId, $studentId, $attemptNumber,
      $fileName, $sizeBytes, $contentType, $filePath, $submittedAt, $effectiveDueAt, $status
    )
  `).run({
    $id: submission.id,
    $assignmentId: submission.assignmentId,
    $courseId: submission.courseId,
    $studentId: submission.studentId,
    $attemptNumber: submission.attemptNumber,
    $fileName: submission.fileName,
    $sizeBytes: submission.sizeBytes,
    $contentType: submission.contentType,
    $filePath: submission.filePath,
    $submittedAt: submission.submittedAt,
    $effectiveDueAt: submission.effectiveDueAt,
    $status: submission.status,
  })
}

export function getSubmission(
  database: Database,
  id: string,
): SubmissionRecord | undefined {
  const row = database.query('SELECT * FROM submissions WHERE id = ?').get(id) as
    | SubmissionRecord
    | null
  return row ?? undefined
}

export function listAttempts(
  database: Database,
  assignmentId: string,
  studentId: string,
): SubmissionRecord[] {
  return database.query(`
    SELECT * FROM submissions
    WHERE assignmentId = ? AND studentId = ?
    ORDER BY attemptNumber ASC
  `).all(assignmentId, studentId) as SubmissionRecord[]
}

export function saveAccommodation(
  database: Database,
  accommodation: AccommodationRecord,
): void {
  database.query(`
    INSERT INTO accommodations (id, assignmentId, studentId, extendedDueAt, reason, grantedBy)
    VALUES ($id, $assignmentId, $studentId, $extendedDueAt, $reason, $grantedBy)
    ON CONFLICT(assignmentId, studentId) DO UPDATE SET
      extendedDueAt = excluded.extendedDueAt,
      reason = excluded.reason,
      grantedBy = excluded.grantedBy
  `).run({
    $id: accommodation.id,
    $assignmentId: accommodation.assignmentId,
    $studentId: accommodation.studentId,
    $extendedDueAt: accommodation.extendedDueAt,
    $reason: accommodation.reason,
    $grantedBy: accommodation.grantedBy,
  })
}

export function getAccommodation(
  database: Database,
  assignmentId: string,
  studentId: string,
): AccommodationRecord | undefined {
  const row = database.query(`
    SELECT * FROM accommodations WHERE assignmentId = ? AND studentId = ?
  `).get(assignmentId, studentId) as AccommodationRecord | null
  return row ?? undefined
}
