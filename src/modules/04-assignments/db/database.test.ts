import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './database'
import {
  getAccommodation,
  getAssignment,
  getSubmission,
  listAssignments,
  listAttempts,
  nextAttemptNumber,
  saveAccommodation,
  saveAssignment,
  saveSubmission,
  type AssignmentRecord,
  type SubmissionRecord,
} from './repository'

const assignment: AssignmentRecord = {
  id: 'a1',
  courseId: '1',
  title: 'Demo',
  description: 'Upload your work',
  dueAt: '2026-11-28T17:00:00Z',
  maxAttempts: 3,
  createdBy: 'instructor-1',
}

const firstAttempt: SubmissionRecord = {
  id: 'submission-1',
  assignmentId: 'a1',
  courseId: '1',
  studentId: 'student-1',
  attemptNumber: 1,
  fileName: 'draft.txt',
  sizeBytes: 12,
  contentType: 'text/plain',
  filePath: '/tmp/example-draft.txt',
  submittedAt: '2026-11-28T16:00:00Z',
  effectiveDueAt: assignment.dueAt,
  status: 'on-time',
}

describe('Module 4 SQLite storage', () => {
  test('supports assignments, submission history, and accommodations in memory', () => {
    const database = createDatabase(':memory:')
    try {
      saveAssignment(database, assignment)
      expect(getAssignment(database, 'a1')).toEqual(assignment)
      expect(listAssignments(database, '1')).toEqual([assignment])
      expect(listAssignments(database, 'other')).toEqual([])

      saveSubmission(database, firstAttempt)
      expect(nextAttemptNumber(database, 'a1', 'student-1')).toBe(2)
      saveSubmission(database, {
        ...firstAttempt,
        id: 'submission-2',
        attemptNumber: 2,
        fileName: 'final.txt',
        submittedAt: '2026-11-28T18:00:00Z',
        status: 'late',
      })
      expect(listAttempts(database, 'a1', 'student-1').map((s) => s.status)).toEqual([
        'on-time',
        'late',
      ])
      expect(listAttempts(database, 'a1', 'other')).toEqual([])

      saveAccommodation(database, {
        id: 'accommodation-1',
        assignmentId: 'a1',
        studentId: 'student-1',
        extendedDueAt: '2026-11-29T17:00:00Z',
        reason: 'Approved extension',
        grantedBy: 'instructor-1',
      })
      expect(getAccommodation(database, 'a1', 'student-1')?.reason).toBe('Approved extension')
    } finally {
      database.close()
    }
  })

  test('preserves assignments and multiple attempts after reopening a disk database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'c3l-m04-'))
    const path = join(dir, 'assignments.sqlite')
    try {
      const initial = createDatabase(path)
      try {
        saveAssignment(initial, assignment)
        saveSubmission(initial, firstAttempt)
        saveSubmission(initial, {
          ...firstAttempt,
          id: 'submission-2',
          attemptNumber: 2,
          fileName: 'final.txt',
          submittedAt: '2026-11-28T18:00:00Z',
          status: 'late',
        })
      } finally {
        initial.close()
      }

      const reopened = createDatabase(path)
      try {
        expect(getAssignment(reopened, 'a1')).toEqual(assignment)
        expect(getSubmission(reopened, 'submission-1')).toEqual(firstAttempt)
        expect(listAttempts(reopened, 'a1', 'student-1')).toHaveLength(2)
        expect(nextAttemptNumber(reopened, 'a1', 'student-1')).toBe(3)
      } finally {
        reopened.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
