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
    // The API spec file
    .get(
      '/openapi.yaml',
      () =>
        new Response(Bun.file(`${import.meta.dir}/openapi.yaml`), {
          headers: { 'Content-Type': 'application/yaml' },
        }),
    )
    // Interactive API docs
    .get(
      '/docs',
      () => `
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
        <div id="swagger"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>SwaggerUIBundle({ url: '${base}/openapi.yaml', dom_id: '#swagger' })</script>
      `,
    )
    .use(notificationRoutes)
    .use(messageRoutes),
})
