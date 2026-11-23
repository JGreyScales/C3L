import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { saveAssignment } from './db/repository'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'

const database = createDatabase(':memory:')
const dir = mkdtempSync(join(tmpdir(), 'm04-route-tests-'))
afterAll(() => { database.close(); rmSync(dir, { recursive: true, force: true }) })
for (const id of ['assignment-001', 'assignment-002']) saveAssignment(database, {
  id, courseId: '1', title: `Assignment ${id}`, description: 'Demo',
  dueAt: '2030-11-23T17:00:00Z', maxAttempts: 3, createdBy: 'teacher',
})
const actor: Actor = { id: 'student-1', role: 'student', name: 'Student' }
const course: CourseInfo = { id: '1', code: 'DEMO', enrollments: [actor.id], instructorId: null, archived: false }
const router = createAssignmentsRouter({ database, uploadDirectory: dir, getActor: async () => actor, getCourse: async id => id === '1' ? course : null })
const origin = 'http://localhost'
const details = '/assignments/assignment-001'
const submissions = `${details}/submissions`
function upload(path: string, ...files: File[]) {
  const body = new FormData()
  for (const file of files) body.append('file', file)
  return router.handle(new Request(origin + path, { method: 'POST', body }))
}

describe('Module 4 submission workflow', () => {
  test('form opens from assignment details', async () => {
    const html = await (await router.handle(new Request(origin + details))).text()
    expect(html).toContain(`href="/04-assignments${submissions}"`)
    const response = await router.handle(new Request(origin + submissions))
    expect(await response.text()).toContain('enctype="multipart/form-data"')
  })
  test('upload redirects to receipt, retains bytes and original download filename', async () => {
    const response = await upload(submissions, new File(['working demo'], 'hello.txt'))
    expect(response.status).toBe(303)
    const receipt = response.headers.get('location')
    expect(receipt).toStartWith(`/04-assignments${submissions}/`)
    if (!receipt) return
    // The module prefix is stripped when invoking its router directly.
    const relative = receipt.replace('/04-assignments', '')
    const receiptResponse = await router.handle(new Request(origin + relative))
    expect(await receiptResponse.text()).toContain('hello.txt')
    const download = await router.handle(new Request(`${origin}${relative}/file`))
    expect(download.headers.get('content-disposition')).toContain('filename="hello.txt"')
    expect(await download.text()).toBe('working demo')
    expect((await router.handle(new Request(origin + relative.replace('assignment-001', 'assignment-002')))).status).toBe(404)
  })
  test('invalid upload creates no receipt', async () => {
    const file = new File(['demo'], 'demo.txt')
    const responses = await Promise.all([
      upload(submissions), upload(submissions, file, file),
      upload(submissions, new File(['demo'], 'demo.exe')),
      upload('/assignments/missing/submissions', file),
    ])
    expect(responses.map(r => r.status)).toEqual([400, 400, 415, 404])
    expect(responses.every(r => !r.headers.has('location'))).toBe(true)
  })
})
