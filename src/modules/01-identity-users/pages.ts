// The HTML pages of Module 1: the front page and the Swagger UI page.
import { escapeHtml } from '../../core/pages'
import { type Endpoint, ENDPOINTS } from './endpoints'

const STYLE = `
  body { font-family: system-ui, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 6px 10px; border-bottom: 1px solid #8884; }
  pre { background: #8881; padding: 12px; overflow-x: auto; }
`

/** "Body: {"name", "email"}" for endpoints that take a JSON body, otherwise nothing. */
function bodyText(endpoint: Endpoint): string {
  if (!endpoint.body) return ''
  const fields = Object.keys(endpoint.body)
    .map((name) => `"${name}"`)
    .join(', ')
  return ` Body: {${fields}}.`
}

export function renderFrontPage(base: string): string {
  const rows = ENDPOINTS.map(
    (endpoint) => `
        <tr>
          <td><code>${endpoint.method.toUpperCase()}</code></td>
          <td><code>${escapeHtml(base + endpoint.path)}</code></td>
          <td>${escapeHtml(endpoint.who)}</td>
          <td>${escapeHtml(endpoint.description + bodyText(endpoint))}</td>
        </tr>`,
  ).join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Module 1: Identity &amp; User Management</title>
        <style>${STYLE}</style>
      </head>
      <body>
        <h1>Module 1: Identity &amp; User Management</h1>
        <p>
          Registration, login and logout, password reset, profiles, roles (student, instructor,
          admin) and account activation. Everything is an endpoint that returns JSON, so the
          other modules can use it.
        </p>
        <p>
          <a href="${escapeHtml(base)}/docs">Try the endpoints in Swagger UI</a>
          (the raw description is <a href="${escapeHtml(base)}/openapi.json">openapi.json</a>)
        </p>

        <h2>Endpoints</h2>
        <table>
          <thead><tr><th>Method</th><th>Address</th><th>Who</th><th>What it does</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <h2>Using it from another module</h2>
        <p>
          Logging in sets a cookie. From a page in the browser the cookie is sent automatically.
          From server code, pass the visitor's cookie along:
        </p>
        <pre>${escapeHtml(`const response = await fetch('http://localhost:3000${base}/api/me', {
  headers: { cookie: request.headers.get('cookie') ?? '' },
})
if (response.status === 401) return 'Please sign in first'
const { user } = await response.json() // user.role is "student", "instructor" or "admin"`)}</pre>
        <p>
          Roles and deactivation are checked against the user file on every
          <code>GET ${escapeHtml(base)}/api/me</code> call, so a change takes effect immediately
          even though the login cookie itself lasts 7 days.
        </p>

        <p><a href="/">Back to the home page</a></p>
      </body>
    </html>
  `
}

/**
 * The Swagger UI page. It loads Swagger UI from a CDN (so the browser needs internet) and points
 * it at this module's /openapi.json. Nothing is installed.
 */
export function renderDocsPage(base: string): string {
  const specUrl = JSON.stringify(`${base}/openapi.json`)
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Module 1 API docs</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
      </head>
      <body>
        <p style="margin: 8px 16px"><a href="${escapeHtml(base)}">Back to Module 1</a></p>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({ url: ${specUrl}, dom_id: '#swagger-ui' })
          }
        </script>
      </body>
    </html>
  `
}
