import { describe, expect, test } from 'bun:test'
import { createDatabase } from './db/database'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'

const database = createDatabase(':memory:')
const instructor: Actor = { id: 'instructor-1', role: 'instructor', name: 'Teacher' }
const course: CourseInfo = {
  id: 'CSCN73030',
  code: 'CSCN73030',
  enrollments: [],
  archived: false,
  instructorId: instructor.id, // #12: must be this course's own instructor
}
const router = createAssignmentsRouter({
  database,
  getActor: async () => instructor,
  getCourse: async (id) => (id === course.id ? course : null),
})

const validInput = {
  courseId: 'CSCN73030',
  title: 'Route Test Assignment',
  description: 'Created through the Elysia POST route.',
  dueDate: '2026-10-23T23:59',
}

function submitAssignment(input: Record<string, string>) {
  return router.handle(
    new Request('http://localhost/assignments/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(input).toString(),
    }),
  )
}

describe('M04-FR-001/002: assignment creation routes', () => {
  test('GET shows the creation form', async () => {
    const response = await router.handle(
      new Request('http://localhost/assignments/new?courseId=CSCN73030'),
    )
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('name="title"')
    expect(html).toContain('name="description"')
    expect(html).toContain('name="dueDate"')
    expect(html).toContain('Toronto time')
  })
  test('POST rejects a missing title', async () => {
    const response = await submitAssignment({ ...validInput, title: '' })
    expect(response.status).toBe(400)
    const body = await response.text()
    expect(body).toContain('Title is required.')
    expect(body).toContain(validInput.description)
  })
  test('POST rejects impossible due date', async () => {
    const response = await submitAssignment({ ...validInput, dueDate: '2026-02-30T10:00' })
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('Due date is not a real calendar date.')
  })
  test('POST creates assignment, retrievable on details and course list', async () => {
    const response = await submitAssignment(validInput)
    expect(response.status).toBe(201)
    const html = await response.text()
    expect(html).toContain('Assignment Created Successfully')
    const id = html.match(/assignments\/([0-9a-f-]{36})/)?.[1]
    expect(id).toBeTruthy()
    if (!id) return
    const details = await router.handle(new Request(`http://localhost/assignments/${id}`))
    expect(details.status).toBe(200)
    expect(await details.text()).toContain('Oct 23, 2026')
    const list = await router.handle(new Request('http://localhost/assignments?courseId=CSCN73030'))
    expect(await list.text()).toContain(id)
  })
  test('course list links to creation form', async () => {
    const response = await router.handle(
      new Request('http://localhost/assignments?courseId=CSCN73030'),
    )
    expect(await response.text()).toContain('/04-assignments/assignments/new?courseId=CSCN73030')
  })
})
