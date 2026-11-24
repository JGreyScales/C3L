import identity from '../01-identity-users'
import coursesModule from '../02-courses'

/** Read-only integration with Modules 1 and 2: no cross-team source files are changed. */
export interface Actor {
  id: string
  role: 'student' | 'instructor' | 'admin'
  name: string
}

export interface CourseInfo {
  id: string
  code: string
  enrollments: string[]
  instructorId: string | null
  archived: boolean
}

/**
 * #12: thrown when Module 1 or Module 2 fails (crashes or answers with an error),
 * so routes can show "Module X is not responding" (503) instead of
 * "Sign in required" or "Course not found".
 */
export class ModuleUnavailableError extends Error {
  constructor(readonly moduleName: 'Module 1 (login)' | 'Module 2 (courses)') {
    super(`${moduleName} is not responding. Please try again in a moment.`)
    this.name = 'ModuleUnavailableError'
  }
}

/** Invokes the already-loaded module router; works without an HTTP listener in Bun tests. */
export async function currentActor(request: Request): Promise<Actor | null> {
  let response: Response
  try {
    response = await identity.router.handle(
      new Request('http://localhost/api/me', { headers: request.headers }),
    )
  } catch {
    throw new ModuleUnavailableError('Module 1 (login)')
  }
  // 401 is Module 1's normal "nobody is signed in" answer. Anything else that is not OK is a fault.
  if (response.status === 401) return null
  if (!response.ok) throw new ModuleUnavailableError('Module 1 (login)')
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('user' in payload)) return null
  const user = (payload as { user?: Partial<Actor> }).user
  if (!user || typeof user.id !== 'string' || typeof user.name !== 'string') return null
  if (user.role !== 'student' && user.role !== 'instructor' && user.role !== 'admin') return null
  return { id: user.id, name: user.name, role: user.role }
}

export async function findCourse(courseId: string): Promise<CourseInfo | null> {
  let response: Response
  try {
    response = await coursesModule.router.handle(new Request('http://localhost/api/courses'))
  } catch {
    throw new ModuleUnavailableError('Module 2 (courses)')
  }
  if (!response.ok) throw new ModuleUnavailableError('Module 2 (courses)')
  // A reply we cannot read is a Module 2 fault, not a missing course.
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ModuleUnavailableError('Module 2 (courses)')
  }
  const courses = (data as { courses?: CourseInfo[] } | null)?.courses
  if (!Array.isArray(courses)) throw new ModuleUnavailableError('Module 2 (courses)')
  // Our assignments may store Module 2's id ("1") or its course code ("PROG2020").
  return courses.find((course) => course.id === courseId || course.code === courseId) ?? null
}

export function canSubmit(actor: Actor, course: CourseInfo): boolean {
  return actor.role === 'student' && !course.archived && course.enrollments.includes(actor.id)
}

/** True if this user is the course's own instructor (Module 2's instructorId). */
export function isCourseInstructor(actor: Actor, course: CourseInfo): boolean {
  return actor.role === 'instructor' && course.instructorId === actor.id
}

/**
 * #12: only THIS course's instructor, or an admin, may create assignments, change due dates
 * or grant accommodations. Note: Module 2 must store the instructor's Module 1 user id as
 * instructorId; until it does, run the demo's instructor steps as an admin.
 */
export function canManage(actor: Actor, course: CourseInfo): boolean {
  if (course.archived) return false
  return actor.role === 'admin' || isCourseInstructor(actor, course)
}

/** This course's instructor or an admin may see every student's saved work, even when archived. */
export function canViewHistory(actor: Actor, course: CourseInfo): boolean {
  return actor.role === 'admin' || isCourseInstructor(actor, course)
}
