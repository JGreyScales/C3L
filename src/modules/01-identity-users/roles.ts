// The three roles an account can have. This file imports nothing, so the API docs can use it too.
export const ROLES = ['student', 'instructor', 'admin'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}
