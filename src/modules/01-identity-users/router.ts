// The routes of Module 1.
//
//   /api/auth/*     Better Auth's own endpoints: sign-up, sign-in, sign-out, password reset...
//   /api/me         who is calling, and edit my own profile
//   /api/users/...  admin tools: list users, change a role, activate / deactivate an account
//   /               the front page that lists all of this (pages.ts)
//   /docs           Swagger UI, and /openapi.json is what it shows (endpoints.ts, openapi.ts)
//
// The login cookie lasts 7 days and cannot be "taken back" by the server. So the /api routes
// below do not trust what is inside the cookie (name, role, active). They only use it to learn
// the user's id, then read the user from the .json file. That is why a role change or a
// deactivation works immediately.
import { Elysia } from 'elysia'
import { type Auth, type AuthOptions, createAuth } from './auth'
import { buildOpenApi } from './openapi'
import { renderDocsPage, renderFrontPage } from './pages'
import { isRole, ROLES, type Role } from './roles'

const json = (status: number, body: unknown) => Response.json(body, { status })

// Elysia must not read the request body itself ('none'). Otherwise Better Auth would find it empty.
const rawBody = { parse: 'none' } as const

/** What the API tells other modules about a user (never the password). */
interface UserInfo {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

function toUserInfo(row: object): UserInfo {
  const user: Record<string, unknown> = { ...row }
  const createdAt = user.createdAt
  return {
    id: String(user.id),
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    role: isRole(user.role) ? user.role : 'student',
    active: user.active !== false,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt ?? ''),
  }
}

/** Reads the request body as a JSON object. Anything else becomes an empty object. */
async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
  } catch {
    // Not JSON: fall through.
  }
  return {}
}

export function createRouter(options: AuthOptions) {
  // Built the first time it is needed, so importing this module touches no files.
  let auth: Auth | undefined
  function getAuth(): Auth {
    if (!auth) auth = createAuth(options)
    return auth
  }

  async function findUser(id: string) {
    const { internalAdapter } = await getAuth().$context
    return internalAdapter.findUserById(id)
  }

  async function changeUser(
    id: string,
    changes: { name?: string; role?: Role; active?: boolean },
  ): Promise<UserInfo | null> {
    const { internalAdapter } = await getAuth().$context
    const updated = await internalAdapter.updateUser(id, changes)
    return updated ? toUserInfo(updated) : null
  }

  /** Who is calling? Null when not signed in, or when the account was deactivated. */
  async function currentUser(request: Request): Promise<UserInfo | null> {
    const session = await getAuth().api.getSession({ headers: request.headers })
    if (!session) return null
    const row = await findUser(session.user.id)
    if (!row) return null
    const user = toUserInfo(row)
    return user.active ? user : null
  }

  /** Checks the caller. Returns the user, or the error response to send back. */
  async function gate(
    request: Request,
    role?: Role,
  ): Promise<{ user: UserInfo } | { fail: Response }> {
    const user = await currentUser(request)
    if (!user) return { fail: json(401, { error: 'Not signed in.' }) }
    if (role && user.role !== role) {
      return { fail: json(403, { error: `Only ${role}s can do this.` }) }
    }
    return { user }
  }

  return (
    new Elysia()
      // Front page of this module. The button on the home page opens it.
      .get('/', () => renderFrontPage(options.mountPath))

      // Swagger UI, and the description of the endpoints it shows (made from endpoints.ts).
      .get('/docs', () => renderDocsPage(options.mountPath))
      .get('/openapi.json', () => json(200, buildOpenApi(options.mountPath)))

      // Everything under /api/auth/ is answered by Better Auth.
      .all('/api/auth/*', ({ request }) => getAuth().handler(request), rawBody)

      .get('/api/me', async ({ request }) => {
        const user = await currentUser(request)
        return user ? json(200, { user }) : json(401, { error: 'Not signed in.' })
      })

      .patch(
        '/api/me',
        async ({ request }) => {
          const check = await gate(request)
          if ('fail' in check) return check.fail

          const { name } = await readJson(request)
          if (typeof name !== 'string' || name.trim() === '' || name.trim().length > 100) {
            return json(400, { error: '"name" must be between 1 and 100 characters.' })
          }
          const user = await changeUser(check.user.id, { name: name.trim() })
          return user ? json(200, { user }) : json(404, { error: 'No such user.' })
        },
        rawBody,
      )

      .get('/api/users', async ({ request }) => {
        const check = await gate(request, 'admin')
        if ('fail' in check) return check.fail

        const { internalAdapter } = await getAuth().$context
        const rows = await internalAdapter.listUsers()
        return json(200, { users: rows.map((row) => toUserInfo(row)) })
      })

      .get('/api/users/:id', async ({ request, params }) => {
        const check = await gate(request)
        if ('fail' in check) return check.fail

        const row = await findUser(params.id)
        if (!row) return json(404, { error: 'No such user.' })

        const user = toUserInfo(row)
        const canSeeEmail = check.user.role === 'admin' || check.user.id === user.id
        const { id, name, role, active } = user
        return json(200, { user: canSeeEmail ? user : { id, name, role, active } })
      })

      .put(
        '/api/users/:id/role',
        async ({ request, params }) => {
          const check = await gate(request, 'admin')
          if ('fail' in check) return check.fail
          if (params.id === check.user.id) {
            return json(400, { error: 'You cannot change your own role.' })
          }

          const { role } = await readJson(request)
          if (!isRole(role)) {
            return json(400, { error: `"role" must be one of: ${ROLES.join(', ')}.` })
          }
          const user = await changeUser(params.id, { role })
          return user ? json(200, { user }) : json(404, { error: 'No such user.' })
        },
        rawBody,
      )

      .put(
        '/api/users/:id/active',
        async ({ request, params }) => {
          const check = await gate(request, 'admin')
          if ('fail' in check) return check.fail
          if (params.id === check.user.id) {
            return json(400, { error: 'You cannot deactivate your own account.' })
          }

          const { active } = await readJson(request)
          if (typeof active !== 'boolean') {
            return json(400, { error: '"active" must be true or false.' })
          }
          const user = await changeUser(params.id, { active })
          return user ? json(200, { user }) : json(404, { error: 'No such user.' })
        },
        rawBody,
      )
  )
}
