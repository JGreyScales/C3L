// M04-FR-009 (late tracking): on-time/late status against the student's effective deadline.
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { saveAccommodation, saveAssignment } from './db/repository'
import { effectiveDueDate, submissionStatus } from './lateness'
import { createSubmissionStore } from './submissions'

describe('late status rules (pure logic)', () => {
  const due = '2030-05-01T23:59:00-04:00'

  test('a submission before the deadline is on time', () => {
    expect(submissionStatus('2030-05-01T23:58:59-04:00', due)).toBe('on-time')
  })

  test('a submission exactly at the deadline is on time', () => {
    expect(submissionStatus(due, due)).toBe('on-time')
  })

  test('a submission one second after the deadline is late', () => {
    expect(submissionStatus('2030-05-02T00:00:00-04:00', due)).toBe('late')
  })

  test('effectiveDueDate uses the accommodation when there is one, otherwise the due date', () => {
    const assignment = { dueAt: due }
    expect(effectiveDueDate(assignment, undefined)).toBe(due)
    expect(effectiveDueDate(assignment, { extendedDueAt: '2030-05-05T23:59:00-04:00' })).toBe(
      '2030-05-05T23:59:00-04:00',
    )
  })

  test('a late submission counts as on time once its extended deadline is used', () => {
    const submittedAt = '2030-05-03T10:00:00-04:00' // after the class deadline
    expect(submissionStatus(submittedAt, due)).toBe('late')
    const extended = effectiveDueDate(
      { dueAt: due },
      { extendedDueAt: '2030-05-04T23:59:00-04:00' },
    )
    expect(submissionStatus(submittedAt, extended)).toBe('on-time')
  })
})

describe('late status when saving a real submission', () => {
  const dir = mkdtempSync(join(tmpdir(), 'm04-late-tests-'))
  const database = createDatabase(':memory:')
  const store = createSubmissionStore(database, dir)
  const inPast = new Date(Date.now() - 60_000).toISOString()
  const inFuture = new Date(Date.now() + 60 * 60_000).toISOString()
  const file = () => new File(['work'], 'work.txt')

  const assignment = (id: string, dueAt: string) =>
    saveAssignment(database, {
      id,
      courseId: '1',
      title: id,
      description: 'Demo',
      dueAt,
      maxAttempts: 3,
      createdBy: 'teacher',
    })

  afterAll(() => {
    database.close()
    rmSync(dir, { recursive: true, force: true })
  })

  test('submitting before the deadline is stored as on-time', async () => {
    assignment('future', inFuture)
    const result = await store.submit('future', file(), 'amy')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.submission.status).toBe('on-time')
  })

  test('submitting after the deadline is stored as late', async () => {
    assignment('past', inPast)
    const result = await store.submit('past', file(), 'ben')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.submission.status).toBe('late')
  })

  test('a resubmission after the deadline is also late, and snapshots its deadline', async () => {
    assignment('past-2', inPast)
    const first = await store.submit('past-2', file(), 'cara')
    const second = await store.submit('past-2', file(), 'cara')
    expect(first.ok && second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.submission.attemptNumber).toBe(2)
      expect(second.submission.status).toBe('late')
      expect(second.submission.effectiveDueAt).toBe(inPast)
    }
  })

  test('an accommodation lets a past-deadline submission count as on-time', async () => {
    assignment('past-3', inPast)
    saveAccommodation(database, {
      id: 'acc-1',
      assignmentId: 'past-3',
      studentId: 'dan',
      extendedDueAt: inFuture,
      reason: 'Approved extension',
      grantedBy: 'teacher',
    })
    const result = await store.submit('past-3', file(), 'dan')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.submission.status).toBe('on-time')
      expect(result.submission.effectiveDueAt).toBe(inFuture)
    }
  })
})
