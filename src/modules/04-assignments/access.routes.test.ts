// #12: who may use each Module 4 route.
// Every protected route is checked for: not signed in (401), wrong person (403), allowed,
// and Module 1 or 2 not responding (503). Modules 1 and 2 are faked with getActor/getCourse.
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { createAssignmentsRouter } from './index'
import { type Actor, type CourseInfo, ModuleUnavailableError } from './integration'

const origin = 'http://localhost'
const people = {
  student: { id: 'student-1', role: 'student', name: 'Enrolled student' },
  classmate: { id: 'student-2', role: 'student', name: 'Another enrolled student' },
  outsider: { id: 'student-3', role: 'student', name: 'Not enrolled' },
  instructor: { id: 'inst-1', role: 'instructor', name: 'This course instructor' },
  otherInstructor: { id: 'inst-2', role: 'instructor', name: 'Another course instructor' },
  admin: { id: 'admin-1', role: 'admin', name: 'Admin' },
} satisfies Record<string, Actor>

const course: CourseInfo = {
  id: '1',
  code: 'PROG2020',
  archived: false,
  instructorId: 'inst-1',
  enrollments: ['student-1', 'student-2'],
}

// One router shared by every test. `signedIn` decides who Module 1 says is signed in,
// and `down` makes Module 1 or 2 fail.
let signedIn: Actor | null = null
let down: 'login' | 'courses' | null = null
const folder = mkdtempSync(join(tmpdir(), 'm04-access-'))
afterAll(() => rmSync(folder, { recursive: true, force: true }))

const router = createAssignmentsRouter({
  database: createDatabase(':memory:'),
  uploadDirectory: join(folder, 'uploads'),
  getActor: async () => {
    if (down === 'login') throw new ModuleUnavailableError('Module 1 (login)')
    return signedIn
  },
  getCourse: async (id) => {
    if (down === 'courses') throw new ModuleUnavailableError('Module 2 (courses)')
    return id === course.id || id === course.code ? course : null
  },
})

/** Runs a request as this person (null = not signed in). */
async function as(person: Actor | null, request: () => Request): Promise<Response> {
  signedIn = person
  down = null
  return router.handle(request())
}

const get = (path: string) => () => new Request(origin + path)
const postForm = (path: string, values: Record<string, string>) => () =>
  new Request(origin + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values).toString(),
  })
const upload = (path: string) => () => {
  const body = new FormData()
  body.set('file', new File(['my answer'], 'answer.txt', { type: 'text/plain' }))
  return new Request(origin + path, { method: 'POST', body })
}

const newAssignment = {
  courseId: '1',
  title: 'Access test',
  description: 'Made by access.routes.test.ts',
  dueDate: '2030-12-01T23:59',
  maxAttempts: '3',
}

// Shared fixtures: one assignment, and one submission by student-1.
let assignmentPath = ''
let receiptPath = ''

describe('setup', () => {
  test('the course instructor creates an assignment and student-1 submits', async () => {
    const created = await as(people.instructor, postForm('/assignments/new', newAssignment))
    expect(created.status).toBe(201)
    const id = (await created.text()).match(/assignments\/([0-9a-f-]{36})/)?.[1]
    expect(id).toBeTruthy()
    assignmentPath = `/assignments/${id}`

    const submitted = await as(people.student, upload(`${assignmentPath}/submissions`))
    expect(submitted.status).toBe(303)
    receiptPath = submitted.headers.get('location')?.replace('/04-assignments', '') ?? ''
    expect(receiptPath).toContain(`${assignmentPath}/submissions/`)
  })
})

describe('create assignment: this course instructor or an admin', () => {
  const create = () => postForm('/assignments/new', newAssignment)

  test('not signed in -> 401', async () => {
    expect((await as(null, create())).status).toBe(401)
  })
  test('student -> 403', async () => {
    expect((await as(people.student, create())).status).toBe(403)
  })
  test('instructor of another course -> 403', async () => {
    expect((await as(people.otherInstructor, create())).status).toBe(403)
  })
  test('this course instructor and admin -> allowed', async () => {
    expect((await as(people.instructor, create())).status).toBe(201)
    expect((await as(people.admin, create())).status).toBe(201)
  })
})

describe('set due date: this course instructor or an admin', () => {
  const change = () => postForm(`${assignmentPath}/due-date`, { dueDate: '2030-12-02T23:59' })

  test('not signed in -> 401', async () => {
    expect((await as(null, change())).status).toBe(401)
  })
  test('student or instructor of another course -> 403', async () => {
    expect((await as(people.student, change())).status).toBe(403)
    expect((await as(people.otherInstructor, change())).status).toBe(403)
  })
  test('this course instructor and admin -> allowed', async () => {
    expect((await as(people.instructor, change())).status).toBe(200)
    expect((await as(people.admin, change())).status).toBe(200)
  })
})

describe('accommodations page: this course instructor or an admin', () => {
  const page = () => get(`${assignmentPath}/accommodations`)

  test('not signed in -> 401', async () => {
    expect((await as(null, page())).status).toBe(401)
  })
  test('student or instructor of another course -> 403', async () => {
    expect((await as(people.student, page())).status).toBe(403)
    expect((await as(people.otherInstructor, page())).status).toBe(403)
  })
  test('this course instructor and admin -> allowed', async () => {
    expect((await as(people.instructor, page())).status).toBe(200)
    expect((await as(people.admin, page())).status).toBe(200)
  })
})

describe('submit: a signed-in student enrolled in the course', () => {
  const submit = () => upload(`${assignmentPath}/submissions`)

  test('not signed in -> 401', async () => {
    expect((await as(null, submit())).status).toBe(401)
  })
  test('student not enrolled -> 403', async () => {
    expect((await as(people.outsider, submit())).status).toBe(403)
  })
  test('wrong role (instructor or admin) -> 403', async () => {
    expect((await as(people.instructor, submit())).status).toBe(403)
    expect((await as(people.admin, submit())).status).toBe(403)
  })
  test('enrolled student -> allowed', async () => {
    expect((await as(people.classmate, submit())).status).toBe(303)
  })
})

describe('receipt and download: the submitter, this course instructor, or an admin', () => {
  const receipt = () => get(receiptPath)
  const file = () => get(`${receiptPath}/file`)

  test('not signed in -> 401', async () => {
    expect((await as(null, receipt())).status).toBe(401)
    expect((await as(null, file())).status).toBe(401)
  })
  test("someone else's receipt (classmate in the same course) -> 403", async () => {
    expect((await as(people.classmate, receipt())).status).toBe(403)
    expect((await as(people.classmate, file())).status).toBe(403)
  })
  test('instructor of another course -> 403', async () => {
    expect((await as(people.otherInstructor, receipt())).status).toBe(403)
    expect((await as(people.otherInstructor, file())).status).toBe(403)
  })
  test('owner, this course instructor and admin -> allowed', async () => {
    for (const person of [people.student, people.instructor, people.admin]) {
      expect((await as(person, receipt())).status).toBe(200)
      const download = await as(person, file())
      expect(download.status).toBe(200)
      expect(await download.text()).toBe('my answer')
    }
  })
})

describe('all-students overview: this course instructor or an admin', () => {
  const overview = () => get(`${assignmentPath}/submissions/all`)

  test('not signed in -> 401', async () => {
    expect((await as(null, overview())).status).toBe(401)
  })
  test('student or instructor of another course -> 403', async () => {
    expect((await as(people.student, overview())).status).toBe(403)
    expect((await as(people.otherInstructor, overview())).status).toBe(403)
  })
  test('this course instructor and admin -> allowed', async () => {
    expect((await as(people.instructor, overview())).status).toBe(200)
    expect((await as(people.admin, overview())).status).toBe(200)
  })
})

describe('history: a student only sees their own attempts', () => {
  test("a student asking for someone else's history still gets only their own", async () => {
    const response = await as(
      people.classmate,
      get(`/api${assignmentPath}/submissions?studentId=student-1`),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { studentId: string }
    expect(body.studentId).toBe('student-2')
  })
  test('instructor of another course cannot read the Gradebook API -> 403', async () => {
    const response = await as(people.otherInstructor, get(`/api${assignmentPath}/submissions`))
    expect(response.status).toBe(403)
  })
})

describe('Module 1 or 2 not responding -> clear 503, not "Course not found"', () => {
  async function whileDown(which: 'login' | 'courses', request: () => Request) {
    signedIn = people.instructor
    down = which
    const response = await router.handle(request())
    down = null
    return response
  }

  test('Module 1 down on a form page', async () => {
    const response = await whileDown('login', postForm('/assignments/new', newAssignment))
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('Module 1 (login) is not responding')
  })
  test('Module 2 down on a form page', async () => {
    const response = await whileDown('courses', get(`${assignmentPath}/submissions/all`))
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('Module 2 (courses) is not responding')
  })
  test('Module 2 down on the Calendar/Dashboard API gives JSON 503', async () => {
    const response = await whileDown('courses', get('/api/assignments?courseId=1'))
    expect(response.status).toBe(503)
    expect(((await response.json()) as { error: string }).error).toContain('Module 2')
  })
  test('the public details page still loads, without instructor links', async () => {
    // Normally the course instructor sees the "Change due date" link...
    expect(await (await as(people.instructor, get(assignmentPath))).text()).toContain('/due-date')
    // ...but while Module 1 is down the page still works, just without it.
    const response = await whileDown('login', get(assignmentPath))
    expect(response.status).toBe(200)
    expect(await response.text()).not.toContain('/due-date')
  })
})
