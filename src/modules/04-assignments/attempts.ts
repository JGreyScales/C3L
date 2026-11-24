// M04-FR-010: Resubmission rules (display side)
// M04-FR-011: Submission history
// Plus the shapes Module 4 shares with other modules (Calendar, Dashboard, Gradebook, Notifications).
//
// The attempt limit itself is enforced when a file is saved (submissions.ts, inside a database
// transaction). This file only turns saved attempts into what pages and other modules show:
//   - history rows, newest first, with the newest attempt marked "current"
//   - attempts used and attempts left
//   - each student's current attempt, for the instructor overview and the gradebook API
//   - the Module 8 notification sent when an assignment is created
//
// Everything here is plain functions with no database or login, so it is easy to test.
import type { AssignmentRecord, SubmissionRecord } from './db/repository'

/** The fields of a saved submission that the history rules need. */
export type AttemptRow = Pick<
  SubmissionRecord,
  'assignmentId' | 'studentId' | 'attemptNumber' | 'submittedAt' | 'status'
>

/** @brief The newest attempt, or undefined if nothing was submitted. */
export function currentAttempt<T extends AttemptRow>(attempts: readonly T[]): T | undefined {
  let current: T | undefined
  for (const attempt of attempts) {
    if (!current || attempt.attemptNumber > current.attemptNumber) current = attempt
  }
  return current
}

/** @brief How many attempts a student has left (never below zero). */
export function attemptsLeft(attempts: readonly AttemptRow[], maxAttempts: number): number {
  return Math.max(0, maxAttempts - attempts.length)
}

export interface HistoryRow<T extends AttemptRow> {
  attempt: T
  isCurrent: boolean
}

/** @brief Rows for the history page: newest attempt first, only the newest marked current. */
export function buildHistory<T extends AttemptRow>(attempts: readonly T[]): HistoryRow<T>[] {
  const current = currentAttempt(attempts)
  return [...attempts]
    .sort((a, b) => b.attemptNumber - a.attemptNumber)
    .map((attempt) => ({ attempt, isCurrent: attempt === current }))
}

export interface StudentSummary<T extends AttemptRow> {
  studentId: string
  attemptCount: number
  current: T
}

/**
 * @brief Each student's current attempt on one assignment, sorted by student ID.
 * Used by the instructor overview page and by the gradebook/analytics API.
 * Students with no attempts are not listed (compare with Module 2's enrollments to find them).
 */
export function summarizeByStudent<T extends AttemptRow>(
  submissions: readonly T[],
  assignmentId: string,
): StudentSummary<T>[] {
  const byStudent = new Map<string, T[]>()
  for (const submission of submissions) {
    if (submission.assignmentId !== assignmentId) continue
    const list = byStudent.get(submission.studentId) ?? []
    list.push(submission)
    byStudent.set(submission.studentId, list)
  }
  const summaries: StudentSummary<T>[] = []
  for (const [studentId, attempts] of byStudent) {
    const current = currentAttempt(attempts)
    if (current) summaries.push({ studentId, attemptCount: attempts.length, current })
  }
  return summaries.sort((a, b) => a.studentId.localeCompare(b.studentId))
}

/** A submission as other modules see it: no server file path. */
export type PublicSubmission = Omit<SubmissionRecord, 'filePath'>

export function toPublicSubmission({ filePath: _hidden, ...row }: SubmissionRecord): PublicSubmission {
  return row
}

/** An assignment as Calendar (Module 11) and Dashboard (Module 12) see it. */
export interface PublicAssignment {
  id: string
  courseId: string
  title: string
  description: string
  dueAt: string
  maxAttempts: number
}

export function toPublicAssignment(record: AssignmentRecord): PublicAssignment {
  return {
    id: record.id,
    courseId: record.courseId,
    title: record.title,
    description: record.description,
    dueAt: record.dueAt,
    maxAttempts: record.maxAttempts,
  }
}

/** Module 8's limits for POST /08-notifications/api/notifications/events. */
export const NOTIFICATION_SUBJECT_MAX = 50
export const NOTIFICATION_MESSAGE_MAX = 280

export interface AssignmentNotification {
  event_type: 'assignment'
  course_id: string
  /** The course's enrolled students (Module 2). Without it, Module 8 uses its own demo list. */
  user_ids?: string[]
  content: { subject: string; message: string }
}

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/** @brief The Module 8 event sent when an instructor creates an assignment. */
export function newAssignmentNotification(assignment: {
  courseId: string
  title: string
  dueLabel: string
  userIds?: readonly string[]
}): AssignmentNotification {
  return {
    event_type: 'assignment',
    course_id: assignment.courseId,
    ...(assignment.userIds ? { user_ids: [...assignment.userIds] } : {}),
    content: {
      subject: shorten(`New assignment: ${assignment.title}`, NOTIFICATION_SUBJECT_MAX),
      message: shorten(`${assignment.title} is due ${assignment.dueLabel}.`, NOTIFICATION_MESSAGE_MAX),
    },
  }
}
