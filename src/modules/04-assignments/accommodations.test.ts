// M04-FR-012 (deadline accommodations): instructor list/remove, and the student's submit page.
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { formatDueDate } from './dueDate'
import { createAssignmentsRouter } from './index'
import type { Actor, CourseInfo } from './integration'
import {
  deleteAccommodation,
  listAccommodations,
  saveAccommodation,
  saveAssignment,
} from './db/repository'

const teacher: Actor = { id: 'teacher', name: 'Instructor', role: 'instructor' }
const student: Actor = { id: 'student-1', name: 'Student', role: 'student' }

function assignment(database: ReturnType<typeof createDatabase>, dueAt: string) {
  saveAssignment(database, {
    id: 'a1',
    courseId: '1',
    title: 'Essay',
    description: 'Demo',
    dueAt,
    maxAttempts: 3,
    createdBy: teacher.id,
  })
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

describe('accommodation repository', () => {
  test('lists granted accommodations and removes one', () => {
    const database = createDatabase(':memory:')
    try {
      assignment(database, '2030-01-01T17:00:00Z')
      saveAccommodation(database, {
        id: 'acc-1',
        assignmentId: 'a1',
        studentId: 'student-1',
        extendedDueAt: '2030-02-01T17:00:00Z',
        reason: 'Documented extension',
        grantedBy: teacher.id,
      })
      expect(listAccommodations(database, 'a1')).toHaveLength(1)
      expect(deleteAccommodation(database, 'a1', 'student-1')).toBe(true)
      expect(listAccommodations(database, 'a1')).toHaveLength(0)
      // Removing again does nothing.
      expect(deleteAccommodation(database, 'a1', 'student-1')).toBe(false)
    } finally {
      database.close()
    }
  })
})

describe('accommodation management page', () => {
  const course: CourseInfo = {
    id: '1',
    code: 'PROG2020',
    enrollments: ['student-1'],
    instructorId: teacher.id, // #12: must be this course's own instructor
    archived: false,
  }

  test('an instructor can grant, see and remove an accommodation', async () => {
    const database = createDatabase(':memory:')
    assignment(database, '2030-01-01T17:00:00Z')
    const router = createAssignmentsRouter({
      database,
      getActor: async () => teacher,
      getCourse: async () => course,
    })
    try {
      const granted = await post(router, '/assignments/a1/accommodations', {
        studentId: 'student-1',
        extendedDueAt: '2030-02-01T17:00',
        reason: 'Documented extension',
      })
      expect(granted.status).toBe(200)

      const page = await (
        await router.handle(new Request('http://localhost/assignments/a1/accommodations'))
      ).text()
      expect(page).toContain('student-1')
      expect(page).toContain('Documented extension') // the instructor does see the reason
      expect(page).toContain('Remove')

      const removed = await post(router, '/assignments/a1/accommodations/remove', {
        studentId: 'student-1',
      })
      expect(removed.status).toBe(200)
      expect(await removed.text()).toContain('Accommodation removed')
      expect(listAccommodations(database, 'a1')).toHaveLength(0)
    } finally {
      database.close()
    }
  })

  test('a student cannot remove an accommodation', async () => {
    const database = createDatabase(':memory:')
    assignment(database, '2030-01-01T17:00:00Z')
    saveAccommodation(database, {
      id: 'acc-2',
      assignmentId: 'a1',
      studentId: 'student-1',
      extendedDueAt: '2030-02-01T17:00:00Z',
      reason: 'Documented extension',
      grantedBy: teacher.id,
    })
    const router = createAssignmentsRouter({
      database,
      getActor: async () => student,
      getCourse: async () => course,
    })
    try {
      const removed = await post(router, '/assignments/a1/accommodations/remove', {
        studentId: 'student-1',
      })
      expect(removed.status).toBe(403)
      expect(listAccommodations(database, 'a1')).toHaveLength(1)
    } finally {
      database.close()
    }
  })
})

describe('submit page shows the student their effective deadline', () => {
  const course: CourseInfo = {
    id: '1',
    code: 'PROG2020',
    enrollments: ['student-1'],
    instructorId: teacher.id, // #12: must be this course's own instructor
    archived: false,
  }
  const classDue = '2030-01-01T17:00:00Z'
  const extendedDue = '2030-02-01T17:00:00Z'

  test('shows the extended due date and hides the private reason', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'm04-accom-'))
    const database = createDatabase(':memory:')
    assignment(database, classDue)
    saveAccommodation(database, {
      id: 'acc-3',
      assignmentId: 'a1',
      studentId: 'student-1',
      extendedDueAt: extendedDue,
      reason: 'secret-medical-note',
      grantedBy: teacher.id,
    })
    const router = createAssignmentsRouter({
      database,
      uploadDirectory: join(folder, 'uploads'),
      getActor: async () => student,
      getCourse: async () => course,
    })
    try {
      const page = await (
        await router.handle(new Request('http://localhost/assignments/a1/submissions'))
      ).text()
      expect(page).toContain(formatDueDate(extendedDue)) // the student's own deadline
      expect(page).toContain('approved extension')
      expect(page).not.toContain('secret-medical-note') // reason is instructor-only
    } finally {
      database.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })

  test('shows the normal due date when there is no accommodation', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'm04-accom-none-'))
    const database = createDatabase(':memory:')
    assignment(database, classDue)
    const router = createAssignmentsRouter({
      database,
      uploadDirectory: join(folder, 'uploads'),
      getActor: async () => student,
      getCourse: async () => course,
    })
    try {
      const page = await (
        await router.handle(new Request('http://localhost/assignments/a1/submissions'))
      ).text()
      expect(page).toContain(formatDueDate(classDue))
      expect(page).not.toContain('approved extension')
    } finally {
      database.close()
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
