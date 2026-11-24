// Route tests for Lanna's Sprint 3 part: history page (FR-011), instructor overview,
// JSON APIs for Modules 6, 9, 11, 12, and the Module 8 notification on create.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AssignmentNotification } from './attempts'
import { createDatabase } from './db/database'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'

const origin = 'http://localhost'
const teacher: Actor = { id: 'teacher-1', role: 'instructor', name: 'Teacher' }
const ana: Actor = { id: 'student-ana', role: 'student', name: 'Ana' }
const ben: Actor = { id: 'student-ben', role: 'student', name: 'Ben' }
const stranger: Actor = { id: 'student-zed', role: 'student', name: 'Not enrolled' }
const course: CourseInfo = {
  id: '1',
  code: 'PROG2020',
  archived: false,
  instructorId: 'inst-1',
  enrollments: [ana.id, ben.id],
}

let folder: string
let actor: Actor | null
let sent: AssignmentNotification[]
let notifyFails: boolean
let router: ReturnType<typeof createAssignmentsRouter>

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'm04-history-'))
  actor = teacher
  sent = []
  notifyFails = false
  router = createAssignmentsRouter({
    database: createDatabase(':memory:'),
    uploadDirectory: join(folder, 'uploads'),
    getActor: async () => actor,
    getCourse: async (id) => (id === course.id ? course : null),
    notify: async (event) => {
      if (notifyFails) throw new Error('Module 8 is down')
      sent.push(event)
    },
  })
})

afterEach(() => rmSync(folder, { recursive: true, force: true }))

function get(path: string) {
  return router.handle(new Request(origin + path))
}

async function createAssignment(title = 'History demo', maxAttempts = '3'): Promise<string> {
  actor = teacher
  const response = await router.handle(
    new Request(`${origin}/assignments/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        courseId: '1',
        title,
        description: 'Submit twice.',
        dueDate: '2030-11-27T23:59',
        maxAttempts,
      }).toString(),
    }),
  )
  expect(response.status).toBe(201)
  const id = (await response.text()).match(/assignments\/([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error('No assignment ID in the response')
  return id
}

async function upload(as: Actor, id: string, fileName: string) {
  actor = as
  const body = new FormData()
  body.set('file', new File([`bytes of ${fileName}`], fileName, { type: 'text/plain' }))
  return router.handle(new Request(`${origin}/assignments/${id}/submissions`, { method: 'POST', body }))
}

describe('student history page (FR-011)', () => {
  test('newest attempt first, marked current, with attempts left', async () => {
    const id = await createAssignment()
    expect((await upload(ana, id, 'draft.txt')).status).toBe(303)
    expect((await upload(ana, id, 'final.txt')).status).toBe(303)
    actor = ana
    const response = await get(`/assignments/${id}/submissions/history`)
    expect(response.status).toBe(200)
    const page = await response.text()
    expect(page.indexOf('Attempt 2')).toBeLessThan(page.indexOf('Attempt 1'))
    expect(page).toContain('(current)')
    expect(page.match(/\(current\)/g)?.length).toBe(1)
    expect(page).toContain('2 of 3 attempts used · 1 left')
    expect(page).toContain('Submit a new attempt')
    expect(page).toContain('Download file')
  })

  test('says so when every attempt is used', async () => {
    const id = await createAssignment('One try', '1')
    await upload(ana, id, 'only.txt')
    actor = ana
    const page = await (await get(`/assignments/${id}/submissions/history`)).text()
    expect(page).toContain('1 of 1 attempts used · 0 left')
    expect(page).toContain('You have used all your attempts')
    expect(page).not.toContain('Submit a new attempt')
  })

  test('a student only ever sees their own attempts', async () => {
    const id = await createAssignment()
    await upload(ana, id, 'ana.txt')
    await upload(ben, id, 'ben.txt')
    actor = ana
    const page = await (await get(`/assignments/${id}/submissions/history?studentId=${ben.id}`)).text()
    expect(page).toContain('ana.txt')
    expect(page).not.toContain('ben.txt')
  })
})

describe('instructor overview of all students (FR-011)', () => {
  test('lists each student’s current attempt with links to their history', async () => {
    const id = await createAssignment()
    await upload(ana, id, 'ana-1.txt')
    await upload(ana, id, 'ana-2.txt')
    await upload(ben, id, 'ben-1.txt')
    actor = teacher
    const response = await get(`/assignments/${id}/submissions/all`)
    expect(response.status).toBe(200)
    const page = await response.text()
    expect(page).toContain('2 student(s) submitted')
    expect(page).toContain('ana-2.txt')
    expect(page).not.toContain('ana-1.txt')
    expect(page).toContain('2 of 3')
    expect(page).toContain(`history?studentId=${ana.id}`)
  })

  test('the history link without a student goes to the overview', async () => {
    const id = await createAssignment()
    actor = teacher
    const response = await get(`/assignments/${id}/submissions/history`)
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toEndWith(`/assignments/${id}/submissions/all`)
  })

  test('instructors can still view the overview after the course is archived', async () => {
    const id = await createAssignment()
    await upload(ana, id, 'ana.txt')
    course.archived = true
    try {
      actor = teacher
      const response = await get(`/assignments/${id}/submissions/all`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain('ana.txt')
    } finally {
      course.archived = false
    }
  })

  test('students cannot open the overview', async () => {
    const id = await createAssignment()
    actor = ana
    expect((await get(`/assignments/${id}/submissions/all`)).status).toBe(403)
    actor = null
    expect((await get(`/assignments/${id}/submissions/all`)).status).toBe(401)
  })
})

describe('JSON API for Gradebook and Analytics', () => {
  test('instructor without studentId gets each student’s current attempt, without file paths', async () => {
    const id = await createAssignment()
    await upload(ana, id, 'ana-1.txt')
    await upload(ana, id, 'ana-2.txt')
    await upload(ben, id, 'ben-1.txt')
    actor = teacher
    const response = await get(`/api/assignments/${id}/submissions`)
    expect(response.status).toBe(200)
    const data = (await response.json()) as {
      submissions: Array<{ studentId: string; attemptNumber: number; attemptCount: number }>
    }
    expect(data.submissions.map((s) => [s.studentId, s.attemptNumber, s.attemptCount])).toEqual([
      [ana.id, 2, 2],
      [ben.id, 1, 1],
    ])
    expect(JSON.stringify(data)).not.toContain('filePath')
  })

  test('a student calling it only gets their own attempts', async () => {
    const id = await createAssignment()
    await upload(ana, id, 'ana.txt')
    await upload(ben, id, 'ben.txt')
    actor = ana
    const data = (await (await get(`/api/assignments/${id}/submissions`)).json()) as {
      studentId: string
      submissions: Array<{ studentId: string }>
    }
    expect(data.studentId).toBe(ana.id)
    expect(data.submissions.every((s) => s.studentId === ana.id)).toBe(true)
  })
})

describe('JSON API for Calendar and Dashboard', () => {
  test('lists a course’s assignments with due dates for anyone in the course', async () => {
    const id = await createAssignment('Calendar item')
    for (const who of [teacher, ana]) {
      actor = who
      const response = await get('/api/assignments?courseId=1')
      expect(response.status).toBe(200)
      const data = (await response.json()) as {
        assignments: Array<{ id: string; title: string; dueAt: string; createdBy?: string }>
      }
      expect(data.assignments).toHaveLength(1)
      expect(data.assignments[0]).toMatchObject({ id, title: 'Calendar item', maxAttempts: 3 })
      expect(data.assignments[0]?.dueAt).toBeTruthy()
      expect(data.assignments[0]?.createdBy).toBeUndefined()
    }
  })

  test('refuses missing course, not signed in, unknown course and outsiders', async () => {
    actor = ana
    expect((await get('/api/assignments')).status).toBe(400)
    expect((await get('/api/assignments?courseId=999')).status).toBe(404)
    actor = stranger
    expect((await get('/api/assignments?courseId=1')).status).toBe(403)
    actor = null
    expect((await get('/api/assignments?courseId=1')).status).toBe(401)
  })
})

describe('Module 8 notification on create', () => {
  test('creating an assignment sends one "assignment" event to the enrolled students', async () => {
    await createAssignment('Lab 4')
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      event_type: 'assignment',
      course_id: '1',
      user_ids: [ana.id, ben.id],
      content: { subject: 'New assignment: Lab 4' },
    })
  })

  test('the assignment is still created when Module 8 is down', async () => {
    notifyFails = true
    const id = await createAssignment('Still created')
    actor = teacher
    expect((await get(`/assignments/${id}`)).status).toBe(200)
  })
})
