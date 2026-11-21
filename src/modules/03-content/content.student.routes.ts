import { Elysia } from 'elysia'
import type { AuthenticatedUser, IdentityAdapter } from './content.auth'
import { authorizeCourseAccess, type ContentPolicyDependencies } from './content.policy'
import { getStudentAccessibleModules } from './module.student-access.service'

export interface StudentRouteDependencies extends ContentPolicyDependencies {
  identity: IdentityAdapter
}

/**
 * Student-facing module listing.
 *
 * Requires a trusted identity and verified course enrollment.
 * Only published and visible modules are returned.
 *
 * This route is not mounted until integration is approved.
 */
export function createStudentContentRoutes(dependencies: StudentRouteDependencies) {
  return new Elysia().get('/api/courses/:courseId/student/modules', async ({ request, params }) => {
    let user: AuthenticatedUser | null

    try {
      user = await dependencies.identity.currentUser(request)
    } catch {
      return Response.json({ error: 'Authentication service unavailable.' }, { status: 503 })
    }

    if (!user) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const access = await authorizeCourseAccess(user, params.courseId, 'study', dependencies)

    if (!access.allowed) {
      return Response.json({ error: 'Course access denied.' }, { status: access.status })
    }

    const modules = await getStudentAccessibleModules(request, params.courseId, async () => true)

    return Response.json({ modules }, { status: 200 })
  })
}
