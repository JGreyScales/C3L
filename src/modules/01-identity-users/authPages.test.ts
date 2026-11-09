// Tests for the pages people use: /register, /login, /profile.
// These only check the HTML shell (the forms, links and the API paths the <script> calls).
// router.test.ts already covers the JSON API these pages call with fetch().
import { expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRouter } from './router'

// These three routes never touch the users file (they only render static HTML), but
// createRouter still needs a path to satisfy its options.
const usersFile = join(mkdtempSync(join(tmpdir(), 'c3l-identity-pages-')), 'users.json')
const router = createRouter({ mountPath: '/01-identity-users', usersFile })

async function html(path: string): Promise<{ status: number; text: string }> {
  // The router's own routes are never prefixed by mountPath (that only affects the links and
  // text it renders); the real prefix is added later by registry.ts when the app mounts it.
  const response = await router.handle(new Request(`http://localhost${path}`))
  return { status: response.status, text: await response.text() }
}

test('the register page has a sign-up form that posts to the real endpoint', async () => {
  const { status, text } = await html('/register')
  expect(status).toBe(200)
  expect(text).toContain('<form id="register-form">')
  expect(text).toContain("BASE + '/api/auth/sign-up/email'")
  expect(text).toContain('Student') // explains the role every new account gets
  expect(text).toContain('/01-identity-users/login') // link between the two pages
})

test('the login page has a sign-in form and explains a deactivated account', async () => {
  const { status, text } = await html('/login')
  expect(status).toBe(200)
  expect(text).toContain('<form id="login-form">')
  expect(text).toContain("BASE + '/api/auth/sign-in/email'")
  expect(text).toContain('deactivated')
  expect(text).toContain('/01-identity-users/register') // link between the two pages
})

test('the profile page reads /api/me, can save a name and can log out', async () => {
  const { status, text } = await html('/profile')
  expect(status).toBe(200)
  expect(text).toContain("BASE + '/api/me'")
  expect(text).toContain("BASE + '/api/auth/sign-out'")
  expect(text).toContain('id="logout"')
})
