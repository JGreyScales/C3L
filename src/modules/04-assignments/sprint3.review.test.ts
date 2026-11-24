import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { listAssignments, saveAssignment } from './db/repository'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'

const teacher: Actor = { id: 'teacher', name: 'Instructor', role: 'instructor' }
const student: Actor = { id: 'student', name: 'Student', role: 'student' }

function record(id: string, dueAt: string) {
  return {
    id,
    courseId: '1',
    title: id,
    description: 'Test',
    dueAt,
    maxAttempts: 3,
    createdBy: teacher.id,
  }
}

function post(
  router: ReturnType<typeof createAssignmentsRouter>,
  path: string,
  values: Record<string, string>,
) {
  return router.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(values).toString(),
    }),
  )
}

describe('Sprint 3 pull-request review regressions', () => {
  test('archive preserves instructor read access, blocks changes, and hides edit links', async () => {
    const database = createDatabase(':memory:')
    let actor: Actor = teacher
    const course: CourseInfo = {
      id: '1',
      code: 'PROG2020',
      enrollments: ['student'],
      instructorId: teacher.id, // #12: must be this course's own instructor
      archived: false,
    }
    saveAssignment(database, record('assignment-1', '2030-01-01T17:00:00Z'))
    const router = createAssignmentsRouter({
      database,
      getActor: async () => actor,
      getCourse: async () => course,
    })
    try {
      const url = 'http://localhost/assignments/assignment-1'
      const instructorPage = await (await router.handle(new Request(url))).text()
      expect(instructorPage).toContain('Change due date')
      expect(instructorPage).toContain('Grant accommodation')
      actor = student
      const studentPage = await (await router.handle(new Request(url))).text()
      expect(studentPage).not.toContain('Change due date')
      expect(studentPage).not.toContain('Grant accommodation')
      expect((await router.handle(new Request(`${url}/due-date`))).status).toBe(403)
      expect((await router.handle(new Request(`${url}/accommodations`))).status).toBe(403)
      actor = teacher
      course.archived = true
      const archivedPage = await (await router.handle(new Request(url))).text()
      expect(archivedPage).toContain('assignment-1')
      expect(archivedPage).not.toContain('Change due date')
      expect(archivedPage).not.toContain('Grant accommodation')
      expect((await router.handle(new Request(`${url}/due-date`))).status).toBe(403)
      expect((await router.handle(new Request(`${url}/accommodations`))).status).toBe(403)
      expect(
        (
          await post(router, '/assignments/new', {
            courseId: '1',
            title: 'Blocked',
            description: 'Blocked',
            dueDate: '2030-01-02T17:00',
          })
        ).status,
      ).toBe(403)
      expect(
        (
          await post(router, '/assignments/assignment-1/due-date', {
            dueDate: '2030-01-02T17:00',
          })
        ).status,
      ).toBe(403)
      expect(
        (
          await post(router, '/assignments/assignment-1/accommodations', {
            studentId: 'student',
            extendedDueAt: '2030-01-03T17:00',
            reason: 'Blocked',
          })
        ).status,
      ).toBe(403)
      const history = await router.handle(
        new Request(`${url}/submissions/history?studentId=student`),
      )
      expect(history.status).toBe(200)
      expect(await history.text()).toContain('Submission history')
      const apiHistory = await router.handle(
        new Request(`http://localhost/api/assignments/assignment-1/submissions?studentId=student`),
      )
      expect(apiHistory.status).toBe(200)
      expect(await apiHistory.json()).toMatchObject({
  studentId: 'student',
})
      actor = student
      expect((await router.handle(new Request(`${url}/submissions`))).status).toBe(403)
    } finally {
      database.close()
    }
  })

  test('instructor can inspect archived receipts and files; student retains own past files', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'm04-archive-'))
    const database = createDatabase(':memory:')
    let actor: Actor = student
    const course: CourseInfo = {
      id: '1',
      code: 'PROG2020',
      enrollments: ['student'],
      instructorId: teacher.id, // #12: must be this course's own instructor
      archived: false,
    }
    saveAssignment(database, record('archived-work', '2030-01-01T17:00:00Z'))
    const router = createAssignmentsRouter({
      database,
      uploadDirectory: join(folder, 'uploads'),
      getActor: async () => actor,
      getCourse: async () => course,
    })
    try {
      const body = new FormData()
      body.set('file', new File(['archived file content'], 'archived.txt', { type: 'text/plain' }))
      const submit = await router.handle(
        new Request('http://localhost/assignments/archived-work/submissions', {
          method: 'POST',
          body,
        }),
      )
      expect(submit.status).toBe(303)
      const receiptPath = submit.headers.get('location')?.replace('/04-assignments', '')
      expect(receiptPath).toBeTruthy()
      if (!receiptPath) return
      course.archived = true
      actor = teacher
      const receipt = await router.handle(new Request(`http://localhost${receiptPath}`))
      expect(receipt.status).toBe(200)
      expect(await receipt.text()).toContain('archived.txt')
      const instructorDownload = await router.handle(
        new Request(`http://localhost${receiptPath}/file`),
      )
      expect(instructorDownload.status).toBe(200)
      expect(await instructorDownload.text()).toBe('archived file content')
      actor = student
      const ownDownload = await router.handle(new Request(`http://localhost${receiptPath}/file`))
      expect(ownDownload.status).toBe(200)
      expect(await ownDownload.text()).toBe('archived file content')
      const ownHistory = await router.handle(
        new Request('http://localhost/assignments/archived-work/submissions/history'),
      )
      expect(ownHistory.status).toBe(200)
      expect(await ownHistory.text()).toContain('Attempt 1')
    } finally {
      database.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })

  test('assignment order uses instant not a mixed-offset timestamp string', () => {
    const database = createDatabase(':memory:')
    try {
      saveAssignment(database, record('later-offset', '2025-12-31T20:00:00-05:00'))
      saveAssignment(database, record('earlier-zulu', '2026-01-01T00:30:00Z'))
      expect(listAssignments(database, '1').map((a) => a.id)).toEqual([
        'earlier-zulu',
        'later-offset',
      ])
    } finally {
      database.close()
    }
  })
})
