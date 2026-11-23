import { describe, expect, test } from 'bun:test'
import { DUE_DATE_ERRORS } from './dueDate'
import { createDatabase } from './db/database'
import { saveAssignment } from './db/repository'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'

const database = createDatabase(':memory:')
for (const record of [
  { id: 'assignment-001', courseId: 'CSCN73030', title: 'Design Sprint 1', description: 'First sprint', dueAt: '2026-10-20T23:59:00-04:00' },
  { id: 'assignment-002', courseId: 'CSCN73030', title: 'Design Sprint 2', description: 'Second sprint', dueAt: '2026-11-03T23:59:00-05:00' },
  { id: 'assignment-003', courseId: 'CSCN73010', title: 'Software Quality Report', description: 'Submit the quality report.', dueAt: '2026-10-25T23:59:00-04:00' },
]) saveAssignment(database, { ...record, maxAttempts: 3, createdBy: 'teacher' })
const actor: Actor = { id: 'teacher', role: 'instructor', name: 'Teacher' }
const getCourse = async (id: string): Promise<CourseInfo> => ({ id, code: id, archived: false, enrollments: [], instructorId: actor.id })
const router = createAssignmentsRouter({ database, getActor: async () => actor, getCourse })
const get = (path: string) => router.handle(new Request(`http://localhost${path}`))
const postDueDate = (id: string, dueDate: string) => router.handle(new Request(`http://localhost/assignments/${id}/due-date`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ dueDate }).toString(),
}))

describe('M04-FR-005: due date pages', () => {
  test('list shows readable Toronto time', async () => {
    const response = await get('/assignments?courseId=CSCN73030')
    expect(await response.text()).toContain('Tue, Oct 20, 2026, 11:59 PM EDT')
  })
  test('details shows date and edit link', async () => {
    const response = await get('/assignments/assignment-001')
    const html = await response.text()
    expect(html).toContain('Tue, Oct 20, 2026, 11:59 PM EDT')
    expect(html).toContain('/assignments/assignment-001/due-date')
  })
  test('form contains current deadline', async () => {
    const response = await get('/assignments/assignment-001/due-date')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('value="2026-10-20T23:59"')
  })
  test('unknown assignment is 404', async () => {
    expect((await get('/assignments/unknown/due-date')).status).toBe(404)
  })
  test('invalid and missing deadlines are rejected', async () => {
    const invalid = await postDueDate('assignment-001', '2026-02-30T10:00')
    expect(invalid.status).toBe(400)
    expect(await invalid.text()).toContain(DUE_DATE_ERRORS.calendar)
    const missing = await postDueDate('assignment-001', '')
    expect(missing.status).toBe(400)
    expect(await missing.text()).toContain(DUE_DATE_ERRORS.missing)
  })
  test('valid deadline persists and other fields are preserved', async () => {
    const response = await postDueDate('assignment-003', '2026-10-27T17:00')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Tue, Oct 27, 2026, 5:00 PM EDT')
    const html = await (await get('/assignments/assignment-003')).text()
    expect(html).toContain('Software Quality Report')
    expect(html).toContain('Submit the quality report.')
  })
})
