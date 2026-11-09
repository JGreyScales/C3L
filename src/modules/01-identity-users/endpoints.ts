// The list of endpoints that other modules can call.
//
// This ONE list feeds the table on the front page (pages.ts) and the Swagger UI (openapi.ts).
// When you add or change a route in router.ts, change it here too.
import { ROLES } from './roles'

export interface Field {
  type: 'string' | 'boolean'
  example: string | boolean
  /** The only values allowed (Swagger UI shows them as a dropdown). */
  allowed?: readonly string[]
}

export interface Endpoint {
  method: 'get' | 'post' | 'patch' | 'put'
  /** Relative to the module folder. ":id" is a part of the address that changes. */
  path: string
  tag: 'Auth' | 'Profile' | 'Users'
  who: 'anyone' | 'signed in' | 'admin'
  summary: string
  description: string
  /** The JSON body, for endpoints that take one. */
  body?: Record<string, Field>
  /** What a successful answer contains, when it is a user or a list of users. */
  returns?: 'user' | 'users'
  /** The error answers: status code -> what it means. */
  errors: Record<string, string>
}

const NOT_SIGNED_IN = 'Not signed in, or the account is deactivated.'
const NOT_ADMIN = 'Only admins can do this.'
const NO_SUCH_USER = 'No such user.'

export const ENDPOINTS: Endpoint[] = [
  {
    method: 'post',
    path: '/api/auth/sign-up/email',
    tag: 'Auth',
    who: 'anyone',
    summary: 'Register',
    description:
      'Creates an account and signs the user in. The first account becomes an admin, everyone after that a student.',
    body: {
      name: { type: 'string', example: 'Ada Lovelace' },
      email: { type: 'string', example: 'ada@example.com' },
      password: { type: 'string', example: 'at-least-8-characters' },
    },
    errors: {
      '400': 'Invalid name, email or password (the answer says which).',
      '422': 'That email is already registered.',
    },
  },
  {
    method: 'post',
    path: '/api/auth/sign-in/email',
    tag: 'Auth',
    who: 'anyone',
    summary: 'Sign in',
    description: 'Sets the login cookie, which is good for 7 days.',
    body: {
      email: { type: 'string', example: 'ada@example.com' },
      password: { type: 'string', example: 'at-least-8-characters' },
    },
    errors: {
      '401': 'Wrong email or password.',
      '403': 'The account has been deactivated.',
    },
  },
  {
    method: 'post',
    path: '/api/auth/sign-out',
    tag: 'Auth',
    who: 'signed in',
    summary: 'Sign out',
    description: 'Clears the login cookie in the browser.',
    errors: {},
  },
  {
    method: 'post',
    path: '/api/auth/request-password-reset',
    tag: 'Auth',
    who: 'anyone',
    summary: 'Ask for a password reset',
    description:
      'No email is sent: the reset token is printed in the console where the server runs.',
    body: { email: { type: 'string', example: 'ada@example.com' } },
    errors: { '400': 'Invalid email.' },
  },
  {
    method: 'post',
    path: '/api/auth/reset-password',
    tag: 'Auth',
    who: 'anyone',
    summary: 'Set a new password with a reset token',
    description: 'Use the token from the "Ask for a password reset" step.',
    body: {
      token: { type: 'string', example: 'paste-the-token-here' },
      newPassword: { type: 'string', example: 'a-new-password' },
    },
    errors: { '400': 'The token is invalid or expired, or the new password is too short.' },
  },
  {
    method: 'post',
    path: '/api/auth/change-password',
    tag: 'Auth',
    who: 'signed in',
    summary: 'Change your password',
    description: 'After the server restarts, sign in again before using this one.',
    body: {
      currentPassword: { type: 'string', example: 'at-least-8-characters' },
      newPassword: { type: 'string', example: 'a-new-password' },
    },
    errors: {
      '400': 'The current password is wrong, or the new password is too short.',
      '401': 'Not signed in.',
    },
  },
  {
    method: 'get',
    path: '/api/me',
    tag: 'Profile',
    who: 'signed in',
    summary: 'Who is calling?',
    description:
      'Returns the current user. Other modules call this to check a login and a role. The role and the active flag are read from the users file, so a change applies immediately.',
    returns: 'user',
    errors: { '401': NOT_SIGNED_IN },
  },
  {
    method: 'patch',
    path: '/api/me',
    tag: 'Profile',
    who: 'signed in',
    summary: 'Edit your own profile',
    description: 'Changes the name of the signed-in user.',
    body: { name: { type: 'string', example: 'Ada King' } },
    returns: 'user',
    errors: { '400': 'The name must be between 1 and 100 characters.', '401': NOT_SIGNED_IN },
  },
  {
    method: 'get',
    path: '/api/users',
    tag: 'Users',
    who: 'admin',
    summary: 'List every user',
    description: 'All accounts with their role and active flag.',
    returns: 'users',
    errors: { '401': NOT_SIGNED_IN, '403': NOT_ADMIN },
  },
  {
    method: 'get',
    path: '/api/users/:id',
    tag: 'Users',
    who: 'signed in',
    summary: 'Look up one user',
    description:
      'Everyone sees id, name, role and active. The email is only shown to admins and to the user themself.',
    returns: 'user',
    errors: { '401': NOT_SIGNED_IN, '404': NO_SUCH_USER },
  },
  {
    method: 'put',
    path: '/api/users/:id/role',
    tag: 'Users',
    who: 'admin',
    summary: 'Change a role',
    description: 'You cannot change your own role.',
    body: { role: { type: 'string', example: 'instructor', allowed: ROLES } },
    returns: 'user',
    errors: {
      '400': 'Unknown role, or you tried to change your own.',
      '401': NOT_SIGNED_IN,
      '403': NOT_ADMIN,
      '404': NO_SUCH_USER,
    },
  },
  {
    method: 'put',
    path: '/api/users/:id/active',
    tag: 'Users',
    who: 'admin',
    summary: 'Activate or deactivate an account',
    description:
      'A deactivated user cannot sign in, and their login stops working at once. You cannot deactivate yourself.',
    body: { active: { type: 'boolean', example: false } },
    returns: 'user',
    errors: {
      '400': '"active" is not true or false, or you tried to deactivate yourself.',
      '401': NOT_SIGNED_IN,
      '403': NOT_ADMIN,
      '404': NO_SUCH_USER,
    },
  },
]
