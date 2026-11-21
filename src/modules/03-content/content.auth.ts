/**
 * Trusted Module 1 identity adapter for Module 3.
 * Never trust client-supplied user IDs or role headers.
 */

export type ContentRole = 'student' | 'instructor' | 'admin'

export interface AuthenticatedUser {
  id: string
  role: ContentRole
  active: boolean
}

export interface IdentityAdapter {
  currentUser(request: Request): Promise<AuthenticatedUser | null>
}

export interface IdentityAdapterOptions {
  /** Fixed, server-configured origin of the C3L application. */
  origin: string
  fetcher?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const user = value as Record<string, unknown>

  return (
    typeof user.id === 'string' &&
    user.id.trim().length > 0 &&
    (user.role === 'student' || user.role === 'instructor' || user.role === 'admin') &&
    user.active === true
  )
}

/**
 * Uses Module 1's /api/me endpoint to validate the visitor's
 * session against the current account record.
 *
 * Missing sessions, malformed responses and unavailable identity
 * services all fail closed.
 */
export function createIdentityAdapter(options: IdentityAdapterOptions): IdentityAdapter {
  const origin = new URL(options.origin)

  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('Invalid trusted identity origin.')
  }

  const endpoint = new URL('/01-identity-users/api/me', origin)
  const fetcher = options.fetcher ?? fetch

  return {
    async currentUser(request: Request): Promise<AuthenticatedUser | null> {
      const cookie = request.headers.get('cookie')

      if (!cookie) return null

      try {
        const response = await fetcher(endpoint, {
          method: 'GET',
          headers: { cookie },
          redirect: 'error',
          signal: AbortSignal.timeout(3000),
        })

        if (!response.ok) return null

        const body: unknown = await response.json()

        if (
          typeof body !== 'object' ||
          body === null ||
          Array.isArray(body) ||
          !('user' in body) ||
          !isAuthenticatedUser(body.user)
        ) {
          return null
        }

        return {
          id: body.user.id,
          role: body.user.role,
          active: true,
        }
      } catch {
        return null
      }
    },
  }
}

