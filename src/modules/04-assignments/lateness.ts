// M04-FR-009 (late tracking) and FR-012 (accommodations): the deadline and on-time/late rules.
//
// These are plain functions with no storage so they can be unit-tested with exact timestamps
// (e.g. one second late, exactly on the deadline) and reused by the submission service and pages.
import type { AccommodationRecord, AssignmentRecord } from './db/repository'

/**
 * The deadline that actually applies to one student: the accommodation's extended date when the
 * student has one, otherwise the assignment's normal due date.
 */
export function effectiveDueDate(
  assignment: Pick<AssignmentRecord, 'dueAt'>,
  accommodation?: Pick<AccommodationRecord, 'extendedDueAt'> | null,
): string {
  return accommodation?.extendedDueAt ?? assignment.dueAt
}

/**
 * A submission is on time when it was made at or before its effective deadline; otherwise late.
 * Submitting exactly at the deadline counts as on time.
 */
export function submissionStatus(submittedAt: string, effectiveDueAt: string): 'on-time' | 'late' {
  return Date.parse(submittedAt) <= Date.parse(effectiveDueAt) ? 'on-time' : 'late'
}
