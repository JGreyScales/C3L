# AI_README: context for AI assistants working in this repo

You are an AI assistant (Claude, Copilot, ChatGPT, Cursor, ...) and a human has asked you to help
with this repository. Read this file fully before you change anything. The human-facing guide is
`README.md`; this file explains the context, the concepts and the guardrails.

---

## 1. The project in one paragraph

C3L is a class project: **one Enterprise Learning Management System (LMS), built by 12 student teams**,
each team owning **one module** (identity, courses, content, assignments, quizzes, gradebook, forum,
notifications, analytics, attendance, calendar, student dashboard). The modules must follow common
standards and be able to run together as one site. Technology: **Bun + Elysia + TypeScript**.
The main app finds every module folder, mounts its Elysia router under the folder name and shows a
"fast click" button for it on the home page.

Who you are probably talking to: a **student with beginner-level skills** working on **their own
module only**. Four human **admins** review and approve every pull request into `main`.

---

## 2. Ground rules (read these twice)

1. **Stay inside the student's module folder**: `src/modules/<NN-name>/`. Create, edit and delete
   files there freely.
2. **Do not edit anything else** unless the human is clearly an admin and asks for it: `src/core/**`,
   `src/app.ts`, `src/index.ts`, `tests/app.test.ts`, `scripts/**`, `.github/**`, `biome.json`,
   `tsconfig.json`, `package.json`, `bun.lock`, `README.md`, `AI_README.md`.
3. **Never touch another team's module folder**, even for an obvious bug. Tell the human what you
   found so they can tell that team.
4. **Never rename or delete a module folder.** The folder name is the public URL and a test checks all
   12 exist.
5. **Never push to `main`.** Work on a `feature/<what-you-do>` branch, commit with meaningful messages
   (imperative, specific: "Add enrollment form to course page"), push the branch, open a pull request
   using `.github/pull_request_template.md`. Admins approve.
6. **Stage only the module folder**: `git add src/modules/<folder>`, not `git add .` or `git add -A`.
7. **Do not add dependencies** (`bun add`) without the human confirming an admin agreed.
8. **No secrets** (passwords, tokens, keys) in code or commits.
9. **Use Bun, not Node tooling.** Commands are `bun run ...`. Do not suggest `npm`, `pnpm` or `yarn`.
   `import.meta.dir` and `Bun.file()` are Bun APIs and are fine here.
10. **Teach while you help.** The human is learning. Make small changes, explain them in plain
    language, and keep the code simple and readable. Do not restructure, add frameworks or "improve"
    things that were not asked for.

---

## 3. How it works

```
bun run dev
   └─ src/index.ts            Bun.serve({ fetch: app.fetch })
        └─ src/app.ts         createApp()
             ├─ loadModules()   scans src/modules/*            (src/core/loadModules.ts)
             │    └─ for each folder: import index.ts -> default export -> registerModule()
             ├─ GET /           home page with one button per module   (src/core/pages.ts)
             └─ fetch(req)      router.handle(req) -> finishResponse(req, res)
```

### Module discovery (`src/core/loadModules.ts`)

- Reads the directories in `src/modules`. Skips names starting with `_` or `.` (that hides `_template`).
- The **folder name becomes the URL prefix**: `src/modules/02-courses` is served at `/02-courses`.
  Folder names must match `^[a-z0-9]+([-_][a-z0-9]+)*$`.
- Imports `index.ts` (or `index.js`). It needs a **default export** produced by `defineModule(...)`.
- A module that fails to load (bad folder name, no `index.ts`, no default export, syntax error,
  invalid definition) is **recorded as a load failure** and shown as a red card on the home page. It
  never crashes the site or the other modules.

### The module contract (`src/core/defineModule.ts`)

```ts
import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir) // "/02-courses": use it to build links

export default defineModule({
  name: 'Module 2: Course Management',   // button text (required)
  description: 'Courses, catalog',       // optional text under the button
  router: new Elysia()                   // required: any Elysia instance, routes relative to the module
    .get('/', () => `<h1>...</h1>`)      // REQUIRED: front page. The button links here.
    .get('/other', () => `<h1>...</h1>`),
})
```

A module **must** have: a default export from `defineModule`, a route `GET /` that answers `200`
with HTML. It **may** have any other routes, any number of files, tests next to the code, and
non-HTML routes (JSON, files).

### Registration (`src/core/registry.ts`)

`registerModule(app, { name, description, router, path, folder })` mounts the router with
`app.group(path, scope => scope.use(router))` and records the module in a per-app `WeakMap`
that the home page reads. It throws on an invalid path or a duplicate path. The router is typed
structurally (`ModuleRouter` = anything with `handle(Request)`) and cast at the `.use()` call,
because Elysia's generics are invariant and reject otherwise-valid routers.

### Responses (`src/core/finishResponse.ts`)

After Elysia answers, `finishResponse` post-processes the finished `Response`:

- `text/plain` or unlabelled responses with a body are relabelled `text/html; charset=utf-8`.
  So **a route can just `return '<h1>Hi</h1>'`**.
- Elysia's bare `404 NOT_FOUND` and 5xx plain-text crashes become friendly HTML pages.
- JSON, files, already-HTML responses, and bodiless responses (redirects, 204) pass through.

**Why this and not an `onAfterHandle` hook or `@elysiajs/html`?** Elysia hooks apply only to routes
registered *after* the hook in the same instance, so a hook on the main app does not reliably reach
routers the students build separately. Post-processing the finished response works for every module
no matter how it builds its router. This is also why `src/index.ts` uses `Bun.serve({ fetch })`
rather than `app.listen()`: so the wrapper always runs. Gotcha: anything labelled `text/plain` is
served as HTML, so real plain text needs a different content type.

---

## 4. The 12 modules

| #  | Folder              | Module                          | Scope from the project brief |
|----|---------------------|---------------------------------|------------------------------|
| 1  | `01-identity-users` | Identity & User Management      | Registration, login/logout, password reset, profiles, roles (Student, Instructor, Admin), account activation/deactivation |
| 2  | `02-courses`        | Course Management               | Create/edit courses, settings, catalog, student enrollment, instructor assignment, archive courses |
| 3  | `03-content`        | Content Management              | Modules/units, upload materials, organize by week/topic, publishing, visibility controls |
| 4  | `04-assignments`    | Assignment & Submission System  | Create assignments, due dates, file submission, resubmission rules, history, late tracking, accommodations |
| 5  | `05-quizzes`        | Quiz & Assessment System        | Create quizzes, multiple-choice / true-false / short-answer, settings, attempts, auto-grading, accommodations |
| 6  | `06-gradebook`      | Gradebook System                | Record grades, calculations, weighting, final grade, student viewing, instructor dashboard, reports |
| 7  | `07-forum`          | Discussion Forum System         | Boards, topics, replies, threads, edit/delete posts, moderation |
| 8  | `08-notifications`  | Notifications & Messaging       | Announcements, in-app notifications, direct messages, assignment/quiz reminders, preferences |
| 9  | `09-analytics`      | Analytics & Reporting           | Activity statistics, participation reports, completion statistics, quiz reports, instructor and admin dashboards |
| 10 | `10-attendance`     | Attendance & Participation      | Record attendance, history, excused/unexcused absences, participation, reports, statistics |
| 11 | `11-calendar`       | Calendar & Scheduling           | Course calendar, deadlines, quiz schedules, event creation, upcoming events, day/week/month views |
| 12 | `12-dashboard`      | Student Dashboard               | Enrolled courses, upcoming deadlines, recent grades, notifications summary, activity feed, personalized welcome |

Each module's `index.ts` starts with a comment containing its scope. The demo router in each is
deliberately minimal (`/` and `/hello`) so the student replaces it.

Course-wide requirements that touch code: use Git/GitHub with feature branches, pull requests and
code review; meaningful commit messages; **unit and integration tests**; follow coding conventions,
use meaningful names, comment complex logic, avoid duplicated code, follow object-oriented design
principles. Help the student meet these without over-engineering.

---

## 5. Recipes

### Add a page
Add one chained ``.get('/path', () => `<html string>`)`` to the module's router. Note the chain:
every route starts with `.`, and **only the last one ends with a comma** (because the router is a
property inside the `defineModule({...})` object). Missing or extra commas are the most common
beginner error here.

```ts
    .get('/hello', () => `<h1>Hello</h1><a href="${base}">Back</a>`)
    .get('/catalog', () => `<h1>Catalog</h1><a href="${base}">Back</a>`),
})
```

### Links
Build links with `base` (`${base}/catalog`). Link to the home page with `/`. A plain `.html` file read
from disk cannot use `${base}`; write the full path (`/02-courses/catalog`).

### Ways to produce HTML
Inline template string; a helper function that builds pages; an `.html` file next to `index.ts` read
with `` Bun.file(`${import.meta.dir}/page.html`).text() `` (return the **text**, a string).

### User input
Escape anything a user typed before putting it in HTML: `import { escapeHtml } from '../../core/pages'`.
Never interpolate raw request data into a page.

### Forms (POST)
See the commented example at the bottom of `src/modules/_template/index.ts`
(`.post('/form', ({ body }) => ..., { body: t.Object({ ... }) })` with `t` imported from `elysia`).

### JSON routes for other modules
Returning an object from a handler sends JSON (`application/json`), which `finishResponse` leaves
untouched. Suggested convention for integration: keep pages at the module's normal routes and expose
data under `/api/...` inside the module (for example `/02-courses/api/courses`). Treat this as a
suggestion; admins decide the integration contract.

### Tests
`bun test` runs every `*.test.ts`. A module's router works standalone, with addresses relative to the
module (no folder prefix):

```ts
import { expect, test } from 'bun:test'
import mod from './index'

test('front page', async () => {
  const res = await mod.router.handle(new Request('http://localhost/'))
  expect(res.status).toBe(200)
})
```

A full example is in `src/modules/_template/index.test.ts`. For tests that go through the main app
(integration), use `createApp()` from `src/app.ts` and `app.fetch(new Request(...))`; this exercises
mounting and `finishResponse` too.

### Extra module folder
Copy `src/modules/_template`, rename the copy (valid folder name, see above), restart the dev server
(new folders are discovered at startup).

---

## 6. Commands

| Command                | What it does |
|------------------------|--------------|
| `bun install`          | Install dependencies (first time, and after `package.json` changes) |
| `bun run dev`          | Start on `http://localhost:3000` (`PORT` env var changes it). Restarts on file changes; **new folders need a manual restart** |
| `bun run start`        | Start without file watching |
| `bun run check`        | Lint + typecheck + tests + sanity. Run before every push |
| `bun run lint`         | Biome lint (blocking in CI) |
| `bun run fix`          | Biome: auto-fix lint problems and format |
| `bun run format:check` | Biome formatting check (advisory in CI) |
| `bun run typecheck`    | `tsc --noEmit` (strict) |
| `bun run test`         | `bun test` |
| `bun run sanity`       | Load every module and open its `/`; fails if any is broken or not HTML |

---

## 7. CI and branch protection

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, one job per check:
**Lint**, **Type check**, **Tests**, **Module sanity check** (all blocking), and
**Formatting (advice only)** (non-blocking). The sanity script prints GitHub `::error` annotations
pointing at the broken module folder. `main` is meant to be protected: pull request required, an
admin approval required (`.github/CODEOWNERS`), checks must pass. An AI cannot and should not work
around this.

---

## 8. Repo map

```
src/index.ts                  server entry (Bun.serve)
src/app.ts                    createApp(): main router + modules + home page
src/core/types.ts             ModuleRouter, ModuleDefinition, RegisteredModule, LoadFailure
src/core/defineModule.ts      defineModule() (validates), moduleBase()
src/core/registry.ts          registerModule(), recordLoadFailure(), getters, SAFE_NAME
src/core/loadModules.ts       module discovery and error isolation
src/core/pages.ts             escapeHtml(), home / 404 / error pages
src/core/finishResponse.ts    text -> HTML relabelling, friendly errors
src/core/checkModules.ts      the sanity check used by the script and the tests
src/modules/_template/        copy-me module (+ example test), hidden from the home page
src/modules/NN-name/index.ts  the 12 modules
tests/app.test.ts             tests for the machinery (writes temp modules into tests/.tmp-modules-*)
scripts/check-modules.ts      `bun run sanity`
.github/                      workflows/ci.yml, CODEOWNERS, pull_request_template.md
```

---

## 9. Common mistakes (check for these first when something is broken)

- No `export default defineModule({...})` (or a named export instead of default).
- Missing `GET /` route, or a `/` route that returns JSON. The module's button needs HTML at `/`.
- Comma/dot mistakes in the route chain; strings using quotes instead of backticks when `${base}` is
  used.
- Folder name with uppercase letters, spaces or dots (not loadable).
- Edited a file outside the module folder (admins will reject the pull request).
- Expecting a new folder to appear without restarting `bun run dev`.
- Putting raw user input into HTML without `escapeHtml`.
- Using Node-only assumptions or `npm`; this repo runs on Bun.
- Adding a heavy framework or state-management layer to a beginner module. Keep it simple.

---

## 10. When unsure

Ask the human. Prefer the smallest change that works, inside their folder, and explain it. If a
request would require changing shared files, say so and suggest they ask an admin.
