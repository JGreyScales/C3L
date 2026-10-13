// Better Auth, set up for this school project.
//
//   - Email + password only (no Google/GitHub login).
//   - No database: users and password hashes live in a .json file (see jsonFile.ts).
//   - "Stateless" sessions: a signed-in user is remembered by an encrypted cookie, so the server
//     keeps no session list. After a server restart people are still signed in.
//   - Every account has a `role` (student, instructor, admin) and an `active` flag.
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { APIError } from 'better-auth/api'
import { createSaver, loadTables, withAutoSave } from './jsonFile'

// School project, so the secret lives right here in the file on purpose. It signs and encrypts
// the login cookies. Anyone who knows it can forge a login, so for a real website this would
// move to an environment variable.
const SECRET = 'c02e3c3aa7d6dc122e05de14d63b97619941f20d61a2b4f8'

const SEVEN_DAYS = 60 * 60 * 24 * 7

export interface ResetLink {
  email: string
  url: string
  token: string
}

export interface AuthOptions {
  /** Where this module is mounted, for example "/01-identity-users" (empty in tests). */
  mountPath: string
  /** The .json file that holds the users and their password hashes. */
  usersFile: string
  /** The website's address. Default: http://localhost:<PORT, or 3000>. */
  baseURL?: string
  /** Called when someone asks for a password reset. Default: print the link in the console. */
  onResetLink?: (link: ResetLink) => void
}

/** The "database" Better Auth uses: its memory adapter, saved to the .json file on each change. */
function createJsonFileDatabase(file: string) {
  const tables = loadTables(file)
  const save = createSaver(file, tables)
  const memory = memoryAdapter(tables)
  return (options: Parameters<typeof memory>[0]) => withAutoSave(memory(options), save)
}

/** There is no email service, so the reset link is printed where the server runs. */
function printResetLink({ email, url, token }: ResetLink): void {
  console.log(`[identity] Password reset for ${email}`)
  console.log(`[identity]   token: ${token}`)
  console.log(`[identity]   link:  ${url}`)
}

export function createAuth(options: AuthOptions) {
  const onResetLink = options.onResetLink ?? printResetLink

  return betterAuth({
    appName: 'C3L',
    secret: SECRET,
    baseURL: options.baseURL ?? `http://localhost:${process.env.PORT ?? 3000}`,
    // Better Auth answers under /<module folder>/api/auth/...
    basePath: `${options.mountPath}/api/auth`,
    database: createJsonFileDatabase(options.usersFile),
    telemetry: { enabled: false },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url, token }) => {
        onResetLink({ email: user.email, url, token })
      },
    },

    // Extra columns on every user. `input: false` means nobody can set them while registering
    // or editing their own profile. Only the admin endpoints in router.ts change them.
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'student', input: false },
        active: { type: 'boolean', required: false, defaultValue: true, input: false },
      },
    },

    session: {
      expiresIn: SEVEN_DAYS,
      // The whole session is stored in an encrypted cookie ("jwe") and trusted for 7 days.
      cookieCache: { enabled: true, strategy: 'jwe', maxAge: SEVEN_DAYS },
    },

    databaseHooks: {
      user: {
        create: {
          // Runs when someone registers. The very first account becomes the admin (otherwise
          // nobody could ever promote anybody). Everybody after that is a student.
          async before(_user, context) {
            const total = context ? await context.context.internalAdapter.countTotalUsers() : 1
            return { data: { role: total === 0 ? 'admin' : 'student', active: true } }
          },
        },
      },
      session: {
        create: {
          // Runs on every sign-in. Deactivated accounts are turned away here.
          async before(session, context) {
            if (!context) return
            const user = await context.context.internalAdapter.findUserById(session.userId)
            if (user && (user as { active?: unknown }).active === false) {
              throw APIError.from('FORBIDDEN', {
                message: 'This account has been deactivated.',
                code: 'ACCOUNT_DEACTIVATED',
              })
            }
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
