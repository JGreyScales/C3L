import { Elysia } from 'elysia'
import { escapeHtml } from '../../../core/pages'
import { auth } from '../auth'
import { page } from '../views'

export const notificationRoutes = new Elysia()
  .use(auth)
  .get('/inbox', ({ user }) =>
    page(
      'Notifications',
      `<h1>Notifications</h1>
      <p>Signed in as ${escapeHtml(user.user_id)}. Coming soon.</p>`,
    ),
  )
  .get('/preferences', () =>
    page('Notification settings', '<h1>Notification settings</h1><p>Coming soon.</p>'),
  )
