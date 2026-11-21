import { describe, expect, test } from 'bun:test'
import type { AuthenticatedUser, IdentityAdapter } from './content.auth'
import type { ContentPolicyDependencies } from './content.policy'
import { createStudentContentRoutes } from './content.student.routes'
import { createLearningModule } from './module.service'
import { setModulePublication } from './module.publication.service'
import { setModuleVisibility } from './module.visibility.service'

const student: AuthenticatedUser = {
  id: 'student-1',
  role: 'student',
  active: true,
}

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  role: 'instructor',
  active: true,
}

function createTestApp(
  options: {
    user?: AuthenticatedUser | null
    courseExists?: boolean
    enrolled?: boolean
    permissionError?: boolean
  } = {},
) {
  const { user = student, courseExists = true, enrolled = true, permissionError = false } = options

  const identity: IdentityAdapter = {
    async currentUser() {
      return user
    },
  }

  const policy: ContentPolicyDependencies = {
    courses: {
      async getCourse(courseId) {
        return courseExists ? { id: courseId, title: 'Test Course', archived: false } : null
      },
    },
    permissions: {
      async canManage() {
        return false
      },
      async canStudy() {
        if (permissionError) {
          throw new Error('Permission service unavailable')
        }
        return enrolled
      },
    },
  }

  return createStudentContentRoutes({
    identity,
    ...policy,
  })
}

function studentRequest() {
  return new Request('http://localhost/api/courses/course-1/student/modules')
}

describe('Module 3 student content HTTP routes', () => {
  test('returns 401 without authentication', async () => {
    const response = await createTestApp({ user: null }).handle(studentRequest())

    expect(response.status).toBe(401)
  })

  test('returns 403 for a student without enrollment', async () => {
    const response = await createTestApp({ enrolled: false }).handle(studentRequest())

    expect(response.status).toBe(403)
  })

  test('returns 404 for a nonexistent course', async () => {
    const response = await createTestApp({ courseExists: false }).handle(studentRequest())

    expect(response.status).toBe(404)
  })

  test('returns 503 when permission lookup fails', async () => {
    const response = await createTestApp({ permissionError: true }).handle(studentRequest())

    expect(response.status).toBe(503)
  })

  test('returns a modules array for an authorized student', async () => {
    const response = await createTestApp().handle(studentRequest())
    const body = (await response.json()) as { modules?: unknown }

    expect(response.status).toBe(200)
    expect(Array.isArray(body.modules)).toBe(true)
  })

  test('rejects an instructor on the student-only endpoint', async () => {
    const response = await createTestApp({ user: instructor }).handle(studentRequest())

    expect(response.status).toBe(403)
  })

  test('returns only published and visible modules from the requested course', async () => {
    const courseId = `visibility-test-${crypto.randomUUID()}`
    const otherCourseId = `other-course-${crypto.randomUUID()}`

    function makeModule(course: string, title: string) {
      return createLearningModule({
        courseId: course,
        title,
        week: 1,
      })
    }

    const allowed = makeModule(courseId, 'Published Visible')
    const hidden = makeModule(courseId, 'Published Hidden')
    const unpublished = makeModule(courseId, 'Unpublished Visible')
    const restricted = makeModule(courseId, 'Unpublished Hidden')
    const otherCourse = makeModule(otherCourseId, 'Other Course')

    setModulePublication(courseId, allowed.id, true)
    setModuleVisibility(courseId, allowed.id, 'visible')

    setModulePublication(courseId, hidden.id, true)

    setModuleVisibility(courseId, unpublished.id, 'visible')

    setModulePublication(otherCourseId, otherCourse.id, true)
    setModuleVisibility(otherCourseId, otherCourse.id, 'visible')

    const request = new Request(`http://localhost/api/courses/${courseId}/student/modules`)

    const response = await createTestApp().handle(request)
    const body = (await response.json()) as {
      modules: Array<{ id: string }>
    }

    expect(response.status).toBe(200)
    expect(body.modules.map((module) => module.id)).toEqual([allowed.id])

    expect(body.modules.some((module) => module.id === hidden.id)).toBe(false)
    expect(body.modules.some((module) => module.id === unpublished.id)).toBe(false)
    expect(body.modules.some((module) => module.id === restricted.id)).toBe(false)
    expect(body.modules.some((module) => module.id === otherCourse.id)).toBe(false)
  })
})
