import { Elysia } from 'elysia'
import { auth } from '../auth'
import { page } from '../views'

export const messageRoutes = new Elysia()
  .use(auth)
  .get('/messages', () => page('Messages', '<h1>Messages</h1><p>Coming soon.</p>'))
