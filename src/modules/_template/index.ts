// =====================================================================
//  MODULE TEMPLATE  -  copy this whole folder, then rename the copy!
//
//  The 12 LMS modules already have their own folders. Use this template only when you
//  need an extra folder (for example to try something out).
//
//  1. Copy the folder  src/modules/_template
//  2. Rename the copy: lowercase, no spaces. Example: 13-my-experiment
//     The folder name becomes the web address:  http://localhost:3000/13-my-experiment
//  3. Change `name` below. It is the text on the button on the home page.
//  4. Add pages in the router. Each page just returns a string of HTML.
//
//  Only change files inside YOUR folder. Never edit src/core or other modules.
// =====================================================================
import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

// Your web address, for example "/13-my-experiment". Use it to make links between your pages.
const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'My Module Name',
  description: 'One sentence about what this module does (you can delete this line)',

  router: new Elysia()
    // This is the front page. The button on the home page opens it.
    .get(
      '/',
      () => `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>My Module</title>
          </head>
          <body>
            <h1>Hello from my module!</h1>
            <p><a href="${base}/second-page">Go to my second page</a></p>
            <p><a href="/">Back to the home page</a></p>
          </body>
        </html>
      `,
    )
    // Another page. It lives at  /<your-folder>/second-page
    .get(
      '/second-page',
      () => `<h1>My second page</h1><a href="${base}">Back to my front page</a>`,
    ),

  // ---- Later: a form that sends data to your router (POST) -------------------------------
  // Add `t` to the import at the top:  import { Elysia, t } from 'elysia'
  // Then add these routes to the router above, right after the '/second-page' line.
  // Each one starts with a dot, just like the routes that are already there:
  //
  //   .get('/form', () => `<form method="post" action="${base}/form">
  //                          <input name="email"> <button>Send</button>
  //                        </form>`)
  //   .post('/form', ({ body }) => `<p>You sent: ${escapeHtml(body.email)}</p>`, {
  //     body: t.Object({ email: t.String() }),
  //   })
  //
  // `escapeHtml` comes from:  import { escapeHtml } from '../../core/pages'
  // It stops people from sneaking HTML into your page. More in the Elysia docs: elysiajs.com
})
