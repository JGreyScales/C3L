// MODULE 1: Identity & User Management
//
// Scope from the project brief:
//   - User registration
//   - Login and logout
//   - Password reset
//   - User profile management
//   - Role management (Student, Instructor, Admin)
//   - Account activation/deactivation
//
// How it is built (see README.md in this folder for setup and notes):
//   router.ts     the routes: /api/auth/* (Better Auth), /api/me, /api/users/..., /docs
//   endpoints.ts  the list of endpoints (front page table and Swagger UI are made from it)
//   openapi.ts    turns that list into the OpenAPI description for Swagger UI
//   auth.ts       the Better Auth settings (email + password, secret)
//   roles.ts      the three roles
//   jsonFile.ts   keeps users and password hashes in data/users.json instead of a database
//   pages.ts      the front page and the Swagger UI page
import { join } from 'node:path'
import { defineModule, moduleBase } from '../../core/defineModule'
import { createRouter } from './router'

const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'Module 1: Identity & User Management',
  description: 'Registration, login, password reset, profiles, roles',

  router: createRouter({
    mountPath: base,
    usersFile: join(import.meta.dir, 'data', 'users.json'),
  }),
})
