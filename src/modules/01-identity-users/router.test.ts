// Tests for the whole module: register, sign in, roles, deactivation, password reset.
// They talk to the router directly and use a temporary users file, never the real one.
// Run with:  bun run test
//
// The tests build on each other (the first account is the admin, and so on), so keep their order.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ENDPOINTS } from './endpoints'
import { createRouter } from './router'

const ORIGIN = 'http://localhost:3000'
const PASSWORD = 'correct-horse-battery'

type TestRouter = ReturnType<typeof createRouter>
interface UserBody {
  user: { id: string; role: string; name: string; active: boolean; email?: string }
}

let folder = ''
let usersFile = ''
let router: TestRouter
const resetTokens: string[] = []

function startRouter(): TestRouter {
  return createRouter({
    mountPath: '',
    usersFile,
    baseURL: ORIGIN,
    // Instead of printing to the console, remember the token so the test can use it.
    onResetLink: ({ token }) => {
      resetTokens.push(token)
    },
  })
}

/** Sends one request. `cookie` is the login cookie from an earlier response. */
function call(
  method: string,
  path: string,
  options: { body?: unknown; cookie?: string; router?: TestRouter } = {},
): Promise<Response> {
  const headers = new Headers({ origin: ORIGIN })
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  if (options.cookie) headers.set('cookie', options.cookie)

  return (options.router ?? router).handle(
    new Request(`${ORIGIN}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
  )
}

/** The login cookie(s) a response asked the browser to store. */
const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

async function register(name: string, extra: Record<string, unknown> = {}) {
  const response = await call('POST', '/api/auth/sign-up/email', {
    body: { name, email: `${name.toLowerCase()}@example.com`, password: PASSWORD, ...extra },
  })
  return { response, cookie: cookieOf(response) }
}

async function signIn(name: string, password = PASSWORD, signInRouter?: TestRouter) {
  return call('POST', '/api/auth/sign-in/email', {
    body: { email: `${name.toLowerCase()}@example.com`, password },
    router: signInRouter,
  })
}

async function me(cookie: string, meRouter?: TestRouter) {
  const response = await call('GET', '/api/me', { cookie, router: meRouter })
  return { status: response.status, body: (await response.json()) as Partial<UserBody> }
}

beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), 'c3l-identity-'))
  usersFile = join(folder, 'users.json')
  router = startRouter()
})
afterAll(() => rmSync(folder, { recursive: true, force: true }))

// Filled in as the tests run.
let adminCookie = ''
let studentCookie = ''
let studentId = ''

describe('Module 1: identity and users', () => {
  test('the front page lists the endpoints', async () => {
    const response = await call('GET', '/')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('/api/auth/sign-in/email')
  })

  test('Swagger UI and the endpoint description are served', async () => {
    const docs = await call('GET', '/docs')
    expect(docs.status).toBe(200)
    expect(await docs.text()).toContain('SwaggerUIBundle')

    const spec = await call('GET', '/openapi.json')
    expect(spec.status).toBe(200)
    const body = (await spec.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(body.openapi).toBe('3.0.3')
    expect(body.paths['/api/me']).toBeDefined()
  })

  test('every endpoint in endpoints.ts really exists', async () => {
    const missing: string[] = []
    for (const endpoint of ENDPOINTS) {
      const response = await call(endpoint.method.toUpperCase(), endpoint.path.replace(':id', 'x'))
      // Not signed in or a missing body gives 401 or 400, but never 404 (no such address).
      if (response.status === 404) missing.push(`${endpoint.method} ${endpoint.path}`)
    }
    expect(missing).toEqual([])
  })

  test('the first account becomes the admin, the next one a student', async () => {
    const first = await register('Alice')
    expect(first.response.status).toBe(200)
    adminCookie = first.cookie
    expect((await me(adminCookie)).body.user?.role).toBe('admin')

    const second = await register('Bob')
    expect(second.response.status).toBe(200)
    studentCookie = second.cookie
    const bob = await me(studentCookie)
    expect(bob.body.user?.role).toBe('student')
    studentId = bob.body.user?.id ?? ''
  })

  test('nobody can choose their own role while registering', async () => {
    const attempt = await register('Mallory', { role: 'admin' })
    if (attempt.response.ok) {
      expect((await me(attempt.cookie)).body.user?.role).toBe('student')
    } else {
      expect(attempt.response.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('a wrong password is turned away, the right one signs in', async () => {
    expect((await signIn('Bob', 'not-the-password')).status).toBe(401)

    const response = await signIn('Bob')
    expect(response.status).toBe(200)
    expect((await me(cookieOf(response))).status).toBe(200)
  })

  test('signing out works', async () => {
    const signedIn = await signIn('Bob')
    const response = await call('POST', '/api/auth/sign-out', { cookie: cookieOf(signedIn) })
    expect(response.status).toBe(200)
  })

  test('/api/me needs a login', async () => {
    expect((await me('')).status).toBe(401)
  })

  test('users can change their own name', async () => {
    const response = await call('PATCH', '/api/me', {
      cookie: studentCookie,
      body: { name: 'Bobby' },
    })
    expect(response.status).toBe(200)
    expect((await me(studentCookie)).body.user?.name).toBe('Bobby')

    const empty = await call('PATCH', '/api/me', { cookie: studentCookie, body: { name: '  ' } })
    expect(empty.status).toBe(400)
  })

  test('only admins can list users', async () => {
    expect((await call('GET', '/api/users')).status).toBe(401)
    expect((await call('GET', '/api/users', { cookie: studentCookie })).status).toBe(403)

    const response = await call('GET', '/api/users', { cookie: adminCookie })
    expect(response.status).toBe(200)
    const { users } = (await response.json()) as { users: unknown[] }
    expect(users.length).toBeGreaterThanOrEqual(2)
  })

  test('other users only see public details, the owner sees the email', async () => {
    const adminId = (await me(adminCookie)).body.user?.id ?? ''

    const seenByStudent = (await (
      await call('GET', `/api/users/${adminId}`, { cookie: studentCookie })
    ).json()) as UserBody
    expect(seenByStudent.user.email).toBeUndefined()

    const seenByOwner = (await (
      await call('GET', `/api/users/${studentId}`, { cookie: studentCookie })
    ).json()) as UserBody
    expect(seenByOwner.user.email).toBe('bob@example.com')
  })

  test('an admin can change a role, and it works immediately', async () => {
    const body = { role: 'instructor' }
    const asStudent = await call('PUT', `/api/users/${studentId}/role`, {
      cookie: studentCookie,
      body,
    })
    expect(asStudent.status).toBe(403)

    const response = await call('PUT', `/api/users/${studentId}/role`, {
      cookie: adminCookie,
      body,
    })
    expect(response.status).toBe(200)
    // The student's old cookie says "student", but /api/me reads the real role from the file.
    expect((await me(studentCookie)).body.user?.role).toBe('instructor')
  })

  test('bad role changes are refused', async () => {
    const adminId = (await me(adminCookie)).body.user?.id ?? ''
    const invalid = await call('PUT', `/api/users/${studentId}/role`, {
      cookie: adminCookie,
      body: { role: 'emperor' },
    })
    expect(invalid.status).toBe(400)

    const ownRole = await call('PUT', `/api/users/${adminId}/role`, {
      cookie: adminCookie,
      body: { role: 'student' },
    })
    expect(ownRole.status).toBe(400)
  })

  test('a deactivated account is locked out, and can be activated again', async () => {
    const off = await call('PUT', `/api/users/${studentId}/active`, {
      cookie: adminCookie,
      body: { active: false },
    })
    expect(off.status).toBe(200)

    expect((await me(studentCookie)).status).toBe(401) // the old cookie stops working at once
    expect((await signIn('Bob')).status).toBe(403) // and so does signing in again

    await call('PUT', `/api/users/${studentId}/active`, {
      cookie: adminCookie,
      body: { active: true },
    })
    expect((await signIn('Bob')).status).toBe(200)
  })

  test('a password can be reset with a token', async () => {
    const request = await call('POST', '/api/auth/request-password-reset', {
      body: { email: 'bob@example.com' },
    })
    expect(request.status).toBe(200)
    expect(resetTokens).toHaveLength(1)

    const reset = await call('POST', '/api/auth/reset-password', {
      body: { token: resetTokens[0], newPassword: 'a-brand-new-password' },
    })
    expect(reset.status).toBe(200)

    expect((await signIn('Bob')).status).toBe(401) // the old password is gone
    expect((await signIn('Bob', 'a-brand-new-password')).status).toBe(200)
  })

  test('accounts and logins survive a server restart', async () => {
    const restarted = startRouter() // a brand-new server that only has the .json file

    expect((await signIn('Bob', 'a-brand-new-password', restarted)).status).toBe(200)
    // Alice's login cookie from before the restart is still good: the cookie is the session.
    expect((await me(adminCookie, restarted)).body.user?.role).toBe('admin')
  })
})
