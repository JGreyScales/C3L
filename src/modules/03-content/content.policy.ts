import type { AuthenticatedUser } from './content.auth'

/** Course information supplied by a trusted course adapter. */
export interface CourseInfo {
  id: string
  title: string
  archived?: boolean
}

/** Looks up courses from Module 2 or another trusted source. */
export interface CourseAdapter {
  getCourse(courseId: string): Promise<CourseInfo | null>
}

/**
 * Checks instructor assignment and student enrollment.
 * Implementations must use trusted server-side data.
 */
export interface CoursePermissionAdapter {
  canManage(user: AuthenticatedUser, courseId: string): Promise<boolean>
  canStudy(user: AuthenticatedUser, courseId: string): Promise<boolean>
}

export interface ContentPolicyDependencies {
  courses: CourseAdapter
  permissions: CoursePermissionAdapter
}

export type ContentAccessResult =
  | { allowed: true; course: CourseInfo }
  | { allowed: false; status: 403 | 404 | 503 }

/**
 * Authorizes access to a course.
 *
 * Unknown courses are rejected. Archived courses and missing
 * permissions never grant access.
 */
export async function authorizeCourseAccess(
  user: AuthenticatedUser,
  courseId: string,
  action: 'manage' | 'study',
  dependencies: ContentPolicyDependencies,
): Promise<ContentAccessResult> {
  if (!user.active || !user.id.trim() || !courseId.trim()) {
    return { allowed: false, status: 403 }
  }

  if (action === 'manage' && user.role !== 'instructor' && user.role !== 'admin') {
    return { allowed: false, status: 403 }
  }

  if (action === 'study' && user.role !== 'student' && user.role !== 'admin') {
    return { allowed: false, status: 403 }
  }

  let course: CourseInfo | null

  try {
    course = await dependencies.courses.getCourse(courseId)
  } catch {
    return { allowed: false, status: 503 }
  }

  if (!course || course.id !== courseId) {
    return { allowed: false, status: 404 }
  }

  if (course.archived) {
    return { allowed: false, status: 403 }
  }

  try {
    const permitted =
      action === 'manage'
        ? await dependencies.permissions.canManage(user, courseId)
        : await dependencies.permissions.canStudy(user, courseId)

    if (!permitted) {
      return { allowed: false, status: 403 }
    }
  } catch {
    return { allowed: false, status: 503 }
  }

  return { allowed: true, course }
}

/**
 * Safe fallback while Module 2 does not provide trusted
 * instructor-assignment or enrollment checks.
 */
export function createDenyAllCoursePermissions(): CoursePermissionAdapter {
  return {
    async canManage() {
      return false
    },
    async canStudy() {
      return false
    },
  }
}
