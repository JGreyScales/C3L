// index.test.ts
// Very small tests for module 2. Bun has a built-in test runner so we don't
// need jest or anything - just import test and expect from 'bun:test'.
//
// `mod.router.handle(...)` runs the router as if a real request came in, so we
// can check status codes and the HTML that comes back.

import { expect, test } from 'bun:test'
import mod from './index'

// Shortcut so I don't have to write the full Request each time.
// Reminder: inside the tests, routes start at "/" - the /02-courses part is
// added by the main app, so we don't include it here.
const get = (path: string) =>
    mod.router.handle(new Request(`http://localhost${path}`))

test('Module 2 dashboard loads', async () => {
    const response = await get('/')
    expect(response.status).toBe(200)
    // Just check it contains the heading - I don't want to lock the test to
    // the exact HTML in case I change the layout later.
    expect(await response.text()).toContain('Course Management')
})

test('Course catalog loads', async () => {
    const response = await get('/catalog')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Course Catalog')
})

test('JSON API works', async () => {
    const response = await get('/api/courses')
    expect(response.status).toBe(200)

    const data = (await response.json()) as {
        courses: Array<{ id: string; code: string; title: string }>
    }
    expect(Array.isArray(data.courses)).toBe(true)
    expect(data.courses.length).toBeGreaterThan(0)
})

// ---- Instructor assignment ----
// Helpers for the assign-instructor tests. The course data lives in memory, so
// these tests use the seeded course '1' and read the result back through the
// JSON API to check the data really changed (not just the page text).

const postForm = (path: string, fields: Record<string, string>) =>
    mod.router.handle(
        new Request(`http://localhost${path}`, {
            method: 'POST',
            body: new URLSearchParams(fields),
        }),
    )

type ApiCourse = { id: string; instructorId: string | null }

const instructorOf = async (id: string) => {
    const data = (await (await get('/api/courses')).json()) as { courses: ApiCourse[] }
    return data.courses.find((c) => c.id === id)?.instructorId
}

test('Edit page shows the instructor picker', async () => {
    const response = await get('/1/edit')
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('name="instructorId"')
    expect(html).toContain('/1/assign-instructor')
    expect(html).toContain('Unassigned')
    expect(html).toContain('Dr. Ada Lovelace')
})

test('Assigning an instructor saves it on the course', async () => {
    const response = await postForm('/1/assign-instructor', { instructorId: 'inst-2' })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Instructor Assigned Successfully')
    expect(await instructorOf('1')).toBe('inst-2')

    // the edit page now pre-selects that instructor
    const html = await (await get('/1/edit')).text()
    expect(html).toContain('value="inst-2" selected')
})

test('Choosing "Unassigned" clears the instructor', async () => {
    await postForm('/1/assign-instructor', { instructorId: 'inst-1' })
    expect(await instructorOf('1')).toBe('inst-1')

    const response = await postForm('/1/assign-instructor', { instructorId: '' })
    expect(response.status).toBe(200)
    expect(await instructorOf('1')).toBeNull()
})

test('Assigning an unknown instructor is rejected and changes nothing', async () => {
    await postForm('/1/assign-instructor', { instructorId: 'inst-3' })

    const response = await postForm('/1/assign-instructor', { instructorId: 'nobody' })
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('Instructor not found')
    expect(await instructorOf('1')).toBe('inst-3')
})

test('Assigning an instructor to a missing course returns 404', async () => {
    const response = await postForm('/does-not-exist/assign-instructor', { instructorId: 'inst-1' })
    expect(response.status).toBe(404)
    expect(await response.text()).toContain('Course not found')
})

test('Editing course details does not wipe the assigned instructor', async () => {
    await postForm('/2/assign-instructor', { instructorId: 'inst-1' })

    await postForm('/2/edit', {
        code: 'CSCN72030',
        title: 'System Architecture',
        description: 'Designing backend systems and APIs.',
        capacity: '40',
    })
    expect(await instructorOf('2')).toBe('inst-1')
})