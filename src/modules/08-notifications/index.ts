import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'
import { messageRoutes } from './messages/routes'
import { notificationRoutes } from './notifications/routes'
import { page } from './views'

const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'Module 8: Notifications & Messaging',
  description: 'Announcements, notifications, direct messages',

  router: new Elysia()
    .get('/', () =>
      page(
        'Notifications & Messaging',
        `<h1>Notifications & Messaging</h1>
        <ul>
          <li><a href="${base}/inbox">Notifications</a></li>
          <li><a href="${base}/messages">Messages</a></li>
        </ul>`,
      ),
    )
    .use(notificationRoutes)
    .use(messageRoutes),
})
