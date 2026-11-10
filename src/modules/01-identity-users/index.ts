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
