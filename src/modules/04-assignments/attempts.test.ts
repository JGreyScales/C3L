import { describe, expect, test } from 'bun:test'
import {
  type AttemptRow,
  attemptsLeft,
  buildHistory,
  currentAttempt,
  NOTIFICATION_MESSAGE_MAX,
  NOTIFICATION_SUBJECT_MAX,
  newAssignmentNotification,
  summarizeByStudent,
  toPublicAssignment,
  toPublicSubmission,
} from './attempts'
import type { SubmissionRecord } from './db/repository'

function attempt(
  studentId: string,
  attemptNumber: number,
  extra: Partial<AttemptRow> = {},
): AttemptRow {
  return {
    assignmentId: 'a1',
    studentId,
    attemptNumber,
    submittedAt: `2026-11-2${attemptNumber}T12:00:00.000Z`,
    status: 'on-time',
    ...extra,
  }
}

describe('FR-011 current attempt and attempts left', () => {
  test('the current attempt is the newest, even if the list is out of order', () => {
    expect(currentAttempt([attempt('s1', 2), attempt('s1', 3), attempt('s1', 1)])?.attemptNumber).toBe(3)
    expect(currentAttempt([])).toBeUndefined()
  })

  test('attempts left counts down and never goes below zero', () => {
    expect(attemptsLeft([], 3)).toBe(3)
    expect(attemptsLeft([attempt('s1', 1), attempt('s1', 2)], 3)).toBe(1)
    expect(attemptsLeft([attempt('s1', 1), attempt('s1', 2), attempt('s1', 3)], 3)).toBe(0)
    expect(attemptsLeft([attempt('s1', 1), attempt('s1', 2)], 1)).toBe(0)
  })
})

describe('FR-011 history page rows', () => {
  test('newest first, and only the newest is marked current', () => {
    const rows = buildHistory([attempt('s1', 1), attempt('s1', 2)])
    expect(rows.map((r) => [r.attempt.attemptNumber, r.isCurrent])).toEqual([
      [2, true],
      [1, false],
    ])
  })

  test('keeps each attempt’s own on-time/late status', () => {
    const rows = buildHistory([attempt('s1', 1), attempt('s1', 2, { status: 'late' })])
    expect(rows.map((r) => r.attempt.status)).toEqual(['late', 'on-time'])
  })

  test('no attempts gives an empty history', () => {
    expect(buildHistory([])).toEqual([])
  })
})

describe('FR-011 every student’s current attempt', () => {
  const all = [
    attempt('s2', 1),
    attempt('s1', 1),
    attempt('s1', 3, { status: 'late' }),
    attempt('s1', 2),
    attempt('s3', 1, { assignmentId: 'a2' }),
  ]

  test('one row per student with their newest attempt and attempt count', () => {
    expect(
      summarizeByStudent(all, 'a1').map((s) => [s.studentId, s.attemptCount, s.current.attemptNumber]),
    ).toEqual([
      ['s1', 3, 3],
      ['s2', 1, 1],
    ])
  })

  test('the current status comes from the newest attempt', () => {
    expect(summarizeByStudent(all, 'a1')[0]?.current.status).toBe('late')
  })

  test('other assignments are ignored', () => {
    expect(summarizeByStudent(all, 'a2').map((s) => s.studentId)).toEqual(['s3'])
    expect(summarizeByStudent(all, 'missing')).toEqual([])
  })
})

describe('shapes shared with other modules', () => {
  test('a public submission never includes the server file path', () => {
    const row: SubmissionRecord = {
      id: 'r1',
      assignmentId: 'a1',
      courseId: '1',
      studentId: 's1',
      attemptNumber: 1,
      fileName: 'report.pdf',
      sizeBytes: 10,
      contentType: 'application/pdf',
      filePath: '/server/data/uploads/secret.pdf',
      submittedAt: '2026-11-21T12:00:00.000Z',
      effectiveDueAt: '2026-11-22T04:59:00.000Z',
      status: 'on-time',
    }
    const shared = toPublicSubmission(row)
    expect('filePath' in shared).toBe(false)
    expect(shared).toMatchObject({ id: 'r1', studentId: 's1', status: 'on-time' })
  })

  test('a public assignment has the calendar fields and no creator', () => {
    expect(
      toPublicAssignment({
        id: 'a1',
        courseId: '1',
        title: 'Lab 1',
        description: 'Do the lab.',
        dueAt: '2026-11-27T23:59:00-05:00',
        maxAttempts: 3,
        createdBy: 'teacher-1',
      }),
    ).toEqual({
      id: 'a1',
      courseId: '1',
      title: 'Lab 1',
      description: 'Do the lab.',
      dueAt: '2026-11-27T23:59:00-05:00',
      maxAttempts: 3,
    })
  })

  test('builds the Module 8 new-assignment notification', () => {
    expect(
      newAssignmentNotification({
        courseId: '1',
        title: 'Design Sprint 3',
        dueLabel: 'Fri, Nov 27, 2026, 11:59 PM EST',
      }),
    ).toEqual({
      event_type: 'assignment',
      course_id: '1',
      content: {
        subject: 'New assignment: Design Sprint 3',
        message: 'Design Sprint 3 is due Fri, Nov 27, 2026, 11:59 PM EST.',
      },
    })
  })

  test('sends the notification to the course’s enrolled students', () => {
    const event = newAssignmentNotification({
      courseId: '1',
      title: 'Lab 4',
      dueLabel: 'tomorrow',
      userIds: ['student-ana', 'student-ben'],
    })
    expect(event.user_ids).toEqual(['student-ana', 'student-ben'])
  })

  test('long titles are shortened to fit Module 8’s limits', () => {
    const title = 'A'.repeat(200)
    const { content } = newAssignmentNotification({ courseId: '1', title, dueLabel: 'tomorrow' })
    expect(content.subject.length).toBe(NOTIFICATION_SUBJECT_MAX)
    expect(content.subject.endsWith('…')).toBe(true)
    expect(content.message.length).toBeLessThanOrEqual(NOTIFICATION_MESSAGE_MAX)
  })
})
