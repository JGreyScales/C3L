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

/** Invokes the already-loaded module router; works without an HTTP listener in Bun tests. */
export async function currentActor(request: Request): Promise<Actor | null> {
  const response = await identity.router.handle(
    new Request('http://localhost/api/me', { headers: request.headers }),
  )
  if (!response.ok) return null
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('user' in payload)) return null
  const user = (payload as { user?: Partial<Actor> }).user
  if (!user || typeof user.id !== 'string' || typeof user.name !== 'string') return null
  if (user.role !== 'student' && user.role !== 'instructor' && user.role !== 'admin') return null
  return { id: user.id, name: user.name, role: user.role }
}

export async function findCourse(courseId: string): Promise<CourseInfo | null> {
  const response = await coursesModule.router.handle(new Request('http://localhost/api/courses'))
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('courses' in data)) return null
  const courses = (data as { courses?: CourseInfo[] }).courses
  if (!Array.isArray(courses)) return null
  return courses.find((course) => course.id === courseId) ?? null
}

export function canSubmit(actor: Actor, course: CourseInfo): boolean {
  return actor.role === 'student' && !course.archived && course.enrollments.includes(actor.id)
}

export function canManage(actor: Actor, course: CourseInfo): boolean {
  // Module 2's instructor dropdown currently uses hard-coded demo IDs, not Module 1 user IDs.
  // Role-based management works now; ownership checks need a real Module 2 identity contract.
  return !course.archived && (actor.role === 'instructor' || actor.role === 'admin')
}

/** Instructors and admins may inspect saved work, including for archived courses. */
export function canViewHistory(actor: Actor): boolean {
  return actor.role === 'instructor' || actor.role === 'admin'
}
