import type { LoadFailure, RegisteredModule } from './types'

/** Makes text safe to put inside HTML, so a name like "<b>" cannot break the page. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    background: Canvas;
    color: CanvasText;
  }
  main { max-width: 1040px; margin: 0 auto; padding: 48px 20px 64px; }
  h1 { margin: 0 0 4px; font-size: 2.2rem; }
  h2 { margin: 40px 0 12px; font-size: 1.2rem; }
  .lead { margin: 0 0 32px; opacity: 0.75; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
    border-radius: 12px;
    color: inherit;
    text-decoration: none;
  }
  a.card:hover, a.card:focus-visible {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px color-mix(in srgb, #2563eb 25%, transparent);
    outline: none;
  }
  .card-name { font-size: 1.1rem; font-weight: 650; }
  .card-desc { opacity: 0.75; flex: 1; }
  .card-go {
    align-self: flex-start;
    margin-top: 4px;
    padding: 6px 14px;
    border-radius: 999px;
    background: #2563eb;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .failed { border-color: #dc2626; background: color-mix(in srgb, #dc2626 8%, transparent); }
  .failed pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 0.85rem; }
  .empty { padding: 24px; border: 2px dashed color-mix(in srgb, CanvasText 30%, transparent); border-radius: 12px; }
  code { font-family: ui-monospace, 'Cascadia Code', Menlo, monospace; font-size: 0.9em; }
  footer { margin-top: 48px; opacity: 0.6; font-size: 0.9rem; }
`

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>${STYLE}</style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`
}

/** The home page: one big fast-click button per module, plus any modules that failed to load. */
export function renderIndexPage(
  modules: readonly RegisteredModule[],
  failures: readonly LoadFailure[],
): string {
  const cards = modules
    .map(
      (mod) => `
        <a class="card" href="${escapeHtml(mod.path)}">
          <span class="card-name">${escapeHtml(mod.name)}</span>
          ${mod.description ? `<span class="card-desc">${escapeHtml(mod.description)}</span>` : ''}
          <span class="card-go">Open ${escapeHtml(mod.path)} &rarr;</span>
        </a>`,
    )
    .join('')

  const modulesSection = modules.length
    ? `<div class="grid">${cards}</div>`
    : `<div class="empty">
         <strong>No modules yet.</strong>
         Copy the folder <code>src/modules/_template</code>, rename the copy, restart the server,
         and your button shows up here.
       </div>`

  const failuresSection = failures.length
    ? `<h2>Modules that could not be loaded</h2>
       <div class="grid">
         ${failures
           .map(
             (failure) => `
           <div class="card failed">
             <span class="card-name">src/modules/${escapeHtml(failure.folder)}</span>
             <pre>${escapeHtml(failure.message)}</pre>
             <span>Fix this, save the file and refresh. If the message stays, restart the server.</span>
           </div>`,
           )
           .join('')}
       </div>`
    : ''

  return layout(
    'C3L',
    `<h1>C3L</h1>
     <p class="lead">Pick a module to jump straight to its pages.</p>
     ${modulesSection}
     ${failuresSection}
     <footer>Building your module? Work inside your own folder in <code>src/modules</code>. The README explains how.</footer>`,
  )
}

export function renderNotFoundPage(path: string): string {
  return layout(
    'Page not found',
    `<h1>404 &ndash; nothing here</h1>
     <p class="lead">There is no page at <code>${escapeHtml(path)}</code>.</p>
     <p><a href="/">&larr; Back to the home page</a></p>`,
  )
}

export function renderErrorPage(path: string, message: string): string {
  return layout(
    'Something broke',
    `<h1>Something broke</h1>
     <p class="lead">The page <code>${escapeHtml(path)}</code> crashed. The team that owns it needs to fix this:</p>
     <div class="card failed"><pre>${escapeHtml(message)}</pre></div>
     <p><a href="/">&larr; Back to the home page</a></p>`,
  )
}
