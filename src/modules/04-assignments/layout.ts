import { escapeHtml } from '../../core/pages'

const styles = `
  :root { color-scheme: light; font-family: system-ui, sans-serif; color: #14253d; background: #eef3f9; }
  * { box-sizing: border-box; }
  body { margin: 0; line-height: 1.55; }
  header { background: #14253d; color: #fff; }
  header nav, main { width: min(100% - 2rem, 52rem); margin-inline: auto; }
  header nav { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding: 1rem 0; }
  header a { color: #fff; }
  header a:last-child { font-size: .9rem; }
  main { padding: 2rem 0 4rem; }
  .panel { background: #fff; border: 1px solid #d5e0ee; border-radius: 1rem; padding: clamp(1.1rem, 4vw, 2.5rem); box-shadow: 0 12px 32px #192d4a10; }
  .eyebrow { margin: 0 0 .6rem; color: #415777; font-weight: 750; font-size: .77rem; letter-spacing: .13em; text-transform: uppercase; }
  h1 { font-size: clamp(1.7rem, 4vw, 2.65rem); letter-spacing: -.035em; line-height: 1.15; margin: 0 0 .85rem; }
  h2 { font-size: 1.25rem; margin: 1.6rem 0 .55rem; }
  p { margin: .65rem 0; }
  a { color: #164a9c; text-underline-offset: .2em; }
  :focus-visible { outline: 3px solid #c06c14; outline-offset: 3px; }
  .actions { display: flex; flex-wrap: wrap; gap: .75rem 1.1rem; align-items: center; margin-top: 1.35rem; }
  button, .button { display: inline-block; width: fit-content; background: #194a9b; color: #fff; border: 1px solid #194a9b; border-radius: .55rem; font: inherit; font-weight: 700; padding: .55rem .9rem; text-decoration: none; cursor: pointer; }
  button:hover, .button:hover { background: #123675; }
  form { display: grid; gap: .8rem; margin: 1.2rem 0; }
  label { display: block; font-weight: 650; }
  input:not([type=hidden]), textarea { display: block; width: 100%; border: 1px solid #9bacc0; border-radius: .5rem; background: #f8fafc; color: inherit; padding: .6rem; font: inherit; }
  .facts, [role=alert], .success { margin: 1rem 0; padding: .85rem 1rem; border-radius: .55rem; }
  .facts { background: #edf3ff; }
  [role=alert] { color: #922822; background: #fff1ee; }
  .success { color: #125736; background: #e7f6ed; font-weight: 700; }
  .assignment-list { padding: 0; list-style: none; }
  .assignment-list li { display: grid; gap: .25rem; padding: .8rem 0; border-bottom: 1px solid #d5e0ee; }
  dt { font-weight: 700; }
  dd { margin: 0 0 .55rem; overflow-wrap: anywhere; }
`

export function assignmentPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | C3L Assignments</title>
  <style>${styles}</style>
</head>
<body>
  <header><nav aria-label="Module navigation"><a href="/04-assignments"><strong>C3L Assignments</strong></a><a href="/">LMS home</a></nav></header>
  <main><section class="panel"><p class="eyebrow">Module 4 · Assignments &amp; Submissions</p>${body}</section></main>
</body>
</html>`
}
