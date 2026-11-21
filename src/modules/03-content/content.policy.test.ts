import { describe, expect, test } from 'bun:test'
import type { AuthenticatedUser } from './content.auth'
import {
  authorizeCourseAccess,
  createDenyAllCoursePermissions,
  type ContentPolicyDependencies,
} from './content.policy'

const instructor: AuthenticatedUser = {
  id: 'instructor-1',
  role: 'instructor',
  active: true,
}

const student: AuthenticatedUser = {
  id: 'student-1',
  role: 'student',
  active: true,
}

function makeDependencies(
  options: {
    courseId?: string
    archived?: boolean
    manageAllowed?: boolean
    studyAllowed?: boolean
  } = {},
): ContentPolicyDependencies {
  const {
    courseId = 'course-1',
    archived = false,
    manageAllowed = false,
    studyAllowed = false,
  } = options

  return {
    courses: {
      async getCourse(id) {
        if (id !== courseId) return null
        return { id, title: 'Test Course', archived }
      },
    },
    permissions: {
      async canManage() {
        return manageAllowed
      },
      async canStudy() {
        return studyAllowed
      },
    },
  }
}

describe('Module 3 course authorization policy', () => {
  test('allows an assigned instructor to manage a course', async () => {
    const result = await authorizeCourseAccess(
      instructor,
      'course-1',
      'manage',
      makeDependencies({ manageAllowed: true }),
    )

    expect(result.allowed).toBe(true)
  })

  test('rejects an instructor without course assignment', async () => {
    const result = await authorizeCourseAccess(instructor, 'course-1', 'manage', makeDependencies())

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('allows an enrolled student to study a course', async () => {
    const result = await authorizeCourseAccess(
      student,
      'course-1',
      'study',
      makeDependencies({ studyAllowed: true }),
    )

    expect(result.allowed).toBe(true)
  })

  test('rejects a student without enrollment', async () => {
    const result = await authorizeCourseAccess(student, 'course-1', 'study', makeDependencies())

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('prevents students from managing course content', async () => {
    const result = await authorizeCourseAccess(
      student,
      'course-1',
      'manage',
      makeDependencies({ manageAllowed: true }),
    )

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('prevents instructors from using student-only access', async () => {
    const result = await authorizeCourseAccess(
      instructor,
      'course-1',
      'study',
      makeDependencies({ studyAllowed: true }),
    )

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('rejects cross-course access', async () => {
    const result = await authorizeCourseAccess(
      instructor,
      'course-2',
      'manage',
      makeDependencies({ courseId: 'course-1', manageAllowed: true }),
    )

    expect(result).toEqual({ allowed: false, status: 404 })
  })

  test('rejects archived courses', async () => {
    const result = await authorizeCourseAccess(
      instructor,
      'course-1',
      'manage',
      makeDependencies({ archived: true, manageAllowed: true }),
    )

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('rejects inactive users', async () => {
    const result = await authorizeCourseAccess(
      { ...instructor, active: false },
      'course-1',
      'manage',
      makeDependencies({ manageAllowed: true }),
    )

    expect(result).toEqual({ allowed: false, status: 403 })
  })

  test('denies access when course permissions are unavailable', async () => {
    const dependencies = makeDependencies()
    dependencies.permissions = {
      async canManage() {
        throw new Error('Permission service unavailable')
      },
      async canStudy() {
        throw new Error('Permission service unavailable')
      },
    }

    const result = await authorizeCourseAccess(instructor, 'course-1', 'manage', dependencies)

    expect(result).toEqual({ allowed: false, status: 503 })
  })

  test('denies access when course lookup fails', async () => {
    const dependencies = makeDependencies()
    dependencies.courses = {
      async getCourse() {
        throw new Error('Course service unavailable')
      },
    }

    const result = await authorizeCourseAccess(student, 'course-1', 'study', dependencies)

    expect(result).toEqual({ allowed: false, status: 503 })
  })

  test('deny-all fallback blocks instructor and student access', async () => {
    const dependencies = makeDependencies()
    dependencies.permissions = createDenyAllCoursePermissions()

    const manageResult = await authorizeCourseAccess(instructor, 'course-1', 'manage', dependencies)

    const studyResult = await authorizeCourseAccess(student, 'course-1', 'study', dependencies)

    expect(manageResult).toEqual({ allowed: false, status: 403 })
    expect(studyResult).toEqual({ allowed: false, status: 403 })
  })
})
