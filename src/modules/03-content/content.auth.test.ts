import { describe, expect, test } from 'bun:test'
import { createIdentityAdapter } from './content.auth'

const origin = 'http://localhost:3000'

function makeRequest(cookie?: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request('http://localhost/03-content/api/test', {
    headers: {
      ...(cookie ? { cookie } : {}),
      ...extraHeaders,
    },
  })
}

describe('Module 3 identity adapter', () => {
  test('accepts a valid active user from Module 1', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async (input, init) => {
        expect(String(input)).toBe('http://localhost:3000/01-identity-users/api/me')
        expect(new Headers(init?.headers).get('cookie')).toBe('session=valid')

        return Response.json({
          user: {
            id: 'instructor-1',
            role: 'instructor',
            active: true,
          },
        })
      },
    })

    expect(await adapter.currentUser(makeRequest('session=valid'))).toEqual({
      id: 'instructor-1',
      role: 'instructor',
      active: true,
    })
  })

  test('rejects a request without a session cookie', async () => {
    let called = false

    const adapter = createIdentityAdapter({
      origin,
      fetcher: async () => {
        called = true
        return Response.json({ user: null })
      },
    })

    expect(await adapter.currentUser(makeRequest())).toBeNull()
    expect(called).toBe(false)
  })

  test('rejects an invalid or expired session', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async () => Response.json({ error: 'Not signed in.' }, { status: 401 }),
    })

    expect(await adapter.currentUser(makeRequest('session=expired'))).toBeNull()
  })

  test('rejects deactivated users', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async () =>
        Response.json({
          user: { id: 'student-1', role: 'student', active: false },
        }),
    })

    expect(await adapter.currentUser(makeRequest('session=inactive'))).toBeNull()
  })

  test('rejects malformed identity responses', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async () =>
        Response.json({
          user: { id: 'student-1', role: 'superadmin', active: true },
        }),
    })

    expect(await adapter.currentUser(makeRequest('session=invalid'))).toBeNull()
  })

  test('ignores forged role and user ID headers', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async (_input, init) => {
        const headers = new Headers(init?.headers)
        expect(headers.has('x-user-role')).toBe(false)
        expect(headers.has('x-user-id')).toBe(false)

        return Response.json({
          user: { id: 'real-student', role: 'student', active: true },
        })
      },
    })

    expect(
      await adapter.currentUser(
        makeRequest('session=valid', {
          'x-user-role': 'admin',
          'x-user-id': 'fake-admin',
        }),
      ),
    ).toEqual({
      id: 'real-student',
      role: 'student',
      active: true,
    })
  })

  test('fails closed when Module 1 is unavailable', async () => {
    const adapter = createIdentityAdapter({
      origin,
      fetcher: async () => {
        throw new Error('Connection refused')
      },
    })

    expect(await adapter.currentUser(makeRequest('session=valid'))).toBeNull()
  })

  test('rejects an invalid trusted origin', () => {
    expect(() =>
      createIdentityAdapter({
        origin: 'https://example.com/path',
      }),
    ).toThrow('Invalid trusted identity origin.')
  })
})
