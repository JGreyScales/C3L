import { moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir)

// Shared page layout. Swap to the class-wide layout later if the admins add one.
export function page(title: string, content: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
  </head>
  <body>
    <nav>
      <a href="/">All modules</a> |
      <a href="${base}/inbox">Notifications</a> |
      <a href="${base}/messages">Messages</a> |
      <a href="${base}/preferences">Settings</a>
    </nav>
    <main>${content}</main>
  </body>
</html>`
}
