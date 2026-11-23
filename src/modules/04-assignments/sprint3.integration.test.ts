import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAssignmentsRouter } from './index'
import { createDatabase } from './db/database'
import type { Actor, CourseInfo } from './integration'

const origin = 'http://localhost'
const teacher: Actor = { id: 'teacher-1', role: 'instructor', name: 'Teacher' }
const student: Actor = { id: 'student-1', role: 'student', name: 'Student' }
const outsider: Actor = { id: 'outsider', role: 'student', name: 'Other student' }
const course: CourseInfo = { id: '1', code: 'PROG2020', archived: false, instructorId: 'inst-1', enrollments: ['student-1', 'outsider'] }

function postForm(router: ReturnType<typeof createAssignmentsRouter>, path: string, values: Record<string, string>) {
  return router.handle(new Request(origin + path, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values).toString(),
  }))
}
function upload(router: ReturnType<typeof createAssignmentsRouter>, path: string, fileName: string) {
  const body = new FormData()
  body.set('file', new File([`original bytes for ${fileName}`], fileName, { type: 'text/plain' }))
  return router.handle(new Request(origin + path, { method: 'POST', body }))
}

describe('Sprint 3 end-to-end user journey', () => {
  test('create -> on-time -> resubmit late -> restart -> history and file survive -> accommodation', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'm04-restart-'))
    const path = join(folder, 'store.sqlite')
    let actor: Actor | null = teacher
    const options = {
      uploadDirectory: join(folder, 'uploads'),
      getActor: async () => actor,
      getCourse: async (id: string) => id === '1' ? course : null,
    }
    let database = createDatabase(path)
    try {
      let router = createAssignmentsRouter({ ...options, database })
      const created = await postForm(router, '/assignments/new', {
        courseId: '1', title: 'Restart demo', description: 'Two attempts', dueDate: '2030-11-23T17:00', maxAttempts: '3',
      })
      expect(created.status).toBe(201)
      const id = (await created.text()).match(/assignments\/([0-9a-f-]{36})/)?.[1]
      expect(id).toBeTruthy()
      if (!id) return
      const prefix = `/assignments/${id}`
      actor = student
      const first = await upload(router, `${prefix}/submissions`, 'first.txt')
      expect(first.status).toBe(303)
      const firstReceipt = first.headers.get('location')?.replace('/04-assignments', '')
      expect(firstReceipt).toBeTruthy()
      actor = teacher
      const changed = await postForm(router, `${prefix}/due-date`, { dueDate: '2020-11-23T17:00' })
      expect(changed.status).toBe(200)
      actor = student
      const second = await upload(router, `${prefix}/submissions`, 'second.txt')
      expect(second.status).toBe(303)
      const secondReceipt = second.headers.get('location')?.replace('/04-assignments', '')
      expect(secondReceipt).toBeTruthy()
      const history = await router.handle(new Request(`${origin}${prefix}/submissions/history`))
      const historyHtml = await history.text()
      expect(historyHtml).toContain('Attempt 1')
      expect(historyHtml).toContain('Attempt 2')
      expect(historyHtml).toContain('on-time')
      expect(historyHtml).toContain('late')
      if (!firstReceipt || !secondReceipt) return

      // A different student must not see someone else's receipt or download.
      actor = outsider
      expect((await router.handle(new Request(origin + firstReceipt))).status).toBe(403)
      expect((await router.handle(new Request(`${origin}${firstReceipt}/file`))).status).toBe(403)
      actor = student

      // A restart closes the DB, then opens the same file with a new app router.
      database.close()
      database = createDatabase(path)
      router = createAssignmentsRouter({ ...options, database })
      // Module 2 currently loses enrollments after restart. Saved work remains visible to its owner.
      course.enrollments = []
      const afterRestart = await router.handle(new Request(`${origin}${prefix}/submissions/history`))
      const restored = await afterRestart.text()
      expect(afterRestart.status).toBe(200)
      expect(restored).toContain('first.txt')
      expect(restored).toContain('second.txt')
      expect(restored).toContain('on-time')
      expect(restored).toContain('late')
      const download = await router.handle(new Request(`${origin}${secondReceipt}/file`))
      expect(download.status).toBe(200)
      expect(download.headers.get('content-disposition')).toContain('filename="second.txt"')
      expect(await download.text()).toBe('original bytes for second.txt')

      // Approved extension applies to new attempts, while previous statuses remain unchanged.
      // Re-enroll for a NEW submission and an instructor-approved extension.
      course.enrollments = ['student-1', 'outsider']
      actor = teacher
      const extension = await postForm(router, `${prefix}/accommodations`, {
        studentId: 'student-1', extendedDueAt: '2030-11-24T17:00', reason: 'Approved extension',
      })
      expect(extension.status).toBe(200)
      actor = student
      expect((await upload(router, `${prefix}/submissions`, 'third.txt')).status).toBe(303)
      const updated = await (await router.handle(new Request(`${origin}${prefix}/submissions/history`))).text()
      expect(updated).toContain('Attempt 3')
      expect((updated.match(/on-time/g) ?? []).length).toBeGreaterThanOrEqual(2)
      const limited = await upload(router, `${prefix}/submissions`, 'fourth.txt')
      expect(limited.status).toBe(409)
    } finally {
      database.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })

  test('authentication and actual course enrollment are required', async () => {
    const database = createDatabase(':memory:')
    try {
      let actor: Actor | null = null
      const router = createAssignmentsRouter({
        database,
        getActor: async () => actor,
        getCourse: async id => id === '1' ? { ...course, enrollments: ['student-1'] } : null,
      })
      const form = { courseId: '1', title: 'Protected', description: 'Demo', dueDate: '2030-11-23T17:00' }
      expect((await postForm(router, '/assignments/new', form)).status).toBe(401)
      actor = student
      expect((await postForm(router, '/assignments/new', form)).status).toBe(403)
      actor = teacher
      expect((await postForm(router, '/assignments/new', form)).status).toBe(201)
    } finally {
      database.close()
    }
  })
})
