# C3L: Enterprise Learning Management System

One website, built by 12 teams. Every team owns **one module** (like "Course Management" or
"Gradebook") and writes its pages inside its own folder. The main app finds every module by itself
and puts a **big button for it on the home page**, so everybody can jump straight to their work.

```
                      http://localhost:3000
        ┌──────────────────────────────────────────────┐
        │  C3L                                         │
        │  ┌────────────┐ ┌────────────┐ ┌──────────┐  │
        │  │ Module 1   │ │ Module 2   │ │ Module 3 │  │   <- one button per module,
        │  │ Identity   │ │ Courses    │ │ Content  │  │      made automatically
        │  │ [ Open ]   │ │ [ Open ]   │ │ [ Open ] │  │
        │  └────────────┘ └────────────┘ └──────────┘  │
        │        ... 12 buttons in total ...           │
        └──────────────────────────────────────────────┘
```

You do not need to know how the main app works. You only need to know **how to add a page to your
own module**. That is step 6 below, and it takes about two minutes.

> Using an AI assistant (Claude, Copilot, ChatGPT...)? Tell it to read **`AI_README.md`** first.
> It explains the project so the AI does not break things for the other teams.

---

## Contents

1. [Which module is mine?](#1-which-module-is-mine)
2. [Install the tools (once)](#2-install-the-tools-once)
3. [Get the project and run it (once)](#3-get-the-project-and-run-it-once)
4. [Your everyday workflow](#4-your-everyday-workflow)
5. [The rules](#5-the-rules)
6. [Add a page to your module](#6-add-a-page-to-your-module)
7. [Other ways to return HTML](#7-other-ways-to-return-html)
8. [Check your work before you push](#8-check-your-work-before-you-push)
9. [Write a test](#9-write-a-test)
10. [Something went wrong](#10-something-went-wrong)
11. [How the project fits together](#11-how-the-project-fits-together)
12. [For the 4 admins](#12-for-the-4-admins)
13. [Glossary](#13-glossary)

---

## 1. Which module is mine?

Every module already has a folder with a working demo inside. **Your folder is the only place you
change files.** The folder name is also your web address.

| #  | Module                            | Your folder                      | Your address (when running locally)           |
|----|-----------------------------------|----------------------------------|-----------------------------------------------|
| 1  | Identity & User Management        | `src/modules/01-identity-users`  | http://localhost:3000/01-identity-users       |
| 2  | Course Management                 | `src/modules/02-courses`         | http://localhost:3000/02-courses              |
| 3  | Content Management                | `src/modules/03-content`         | http://localhost:3000/03-content              |
| 4  | Assignment & Submission System    | `src/modules/04-assignments`     | http://localhost:3000/04-assignments          |
| 5  | Quiz & Assessment System          | `src/modules/05-quizzes`         | http://localhost:3000/05-quizzes              |
| 6  | Gradebook System                  | `src/modules/06-gradebook`       | http://localhost:3000/06-gradebook            |
| 7  | Discussion Forum System           | `src/modules/07-forum`           | http://localhost:3000/07-forum                |
| 8  | Notifications & Messaging         | `src/modules/08-notifications`   | http://localhost:3000/08-notifications        |
| 9  | Analytics & Reporting             | `src/modules/09-analytics`       | http://localhost:3000/09-analytics            |
| 10 | Attendance & Participation        | `src/modules/10-attendance`      | http://localhost:3000/10-attendance           |
| 11 | Calendar & Scheduling             | `src/modules/11-calendar`        | http://localhost:3000/11-calendar             |
| 12 | Student Dashboard                 | `src/modules/12-dashboard`       | http://localhost:3000/12-dashboard            |

Open your folder's `index.ts`. The comment at the top lists what your module has to do, copied from
the project brief.

**Do not rename or delete your folder.** Everybody's links depend on the names.

---

## 2. Install the tools (once)

You need three things: **Git**, **Bun** and a code editor. Skip any you already have.

### 2.1 Git (saves your work and shares it)

Download and install from https://git-scm.com/downloads. Keep all the default choices.

Then open a terminal (see the tip below) and tell Git who you are. Use your own name and the email of
your GitHub account:

```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 2.2 Bun (runs the project)

Open a terminal and paste the line for your computer.

**Windows:**

```
powershell -c "irm bun.sh/install.ps1|iex"
```

**Mac or Linux:**

```
curl -fsSL https://bun.com/install | bash
```

(Windows needs Windows 10 version 1809 or newer. If the line does not work and you already have
Node.js, `npm install -g bun` also installs Bun.)

**Now close the terminal and open a new one.** This step matters: the old terminal does not know
about Bun yet.

### 2.3 A code editor

Install [Visual Studio Code](https://code.visualstudio.com). Any editor works, but the rest of this
guide assumes VS Code.

### 2.4 Check that it worked

In a new terminal:

```
git --version
bun --version
```

Both should print a version number. If one says "command not found" or "not recognized", go to
[Something went wrong](#10-something-went-wrong).

> **Tip: what is a terminal?** It is the window where you type commands. In VS Code, press
> **Ctrl + `** (the key above Tab) to open one at the bottom. It starts inside your project folder,
> which is exactly where you want it.

---

## 3. Get the project and run it (once)

Type these one at a time, pressing Enter after each:

```
git clone https://github.com/JGreyScales/C3L.git
cd C3L
bun install
bun run dev
```

What they do:

| Command                | What happens                                                         |
|------------------------|----------------------------------------------------------------------|
| `git clone ...`        | Downloads the project into a new folder called `C3L`                 |
| `cd C3L`               | Moves your terminal into that folder                                 |
| `bun install`          | Downloads the libraries the project uses (takes a minute)            |
| `bun run dev`          | Starts the website                                                   |

You should see:

```
  C3L is running!  Open  http://localhost:3000  in your browser.
```

Open **http://localhost:3000** in your browser. You should see 12 module buttons. Click yours.

To stop the website, click in the terminal and press **Ctrl + C**.

Then open the folder in VS Code: **File > Open Folder...** and pick the `C3L` folder.

> While `bun run dev` is running, every time you **save a file** the site restarts by itself.
> Just refresh your browser to see the change.

---

## 4. Your everyday workflow

You never change the `main` branch directly. `main` is the finished, shared version, and it is
protected: **changes only get in through a pull request that an admin approves.** The steps below are
how you do that.

### Step 1. Start from the latest version

```
git checkout main
git pull
```

### Step 2. Make your own branch

A branch is your private copy to work on. Give it a name that says what you are doing:

```
git checkout -b feature/module-2-course-catalog
```

(Always start the name with `feature/`, use lowercase and use `-` instead of spaces.)

### Step 3. Do your work

Edit files inside **your module folder**. Start the site with `bun run dev` and look at it in your
browser as you go.

### Step 4. Check your work

```
bun run check
```

It must finish without errors. [Section 8](#8-check-your-work-before-you-push) explains it.

### Step 5. Save your work (commit)

Add only **your folder**, then commit with a message that says what you changed:

```
git add src/modules/02-courses
git commit -m "Add course catalog page to module 2"
```

Good messages say what changed ("Add enrollment form to course page"). Bad messages say nothing
("stuff", "fix", "asdf"). Your teacher can see them.

You can do steps 3 to 5 as many times as you like.

### Step 6. Send it to GitHub

```
git push -u origin feature/module-2-course-catalog
```

(Use your own branch name. The first push needs `-u origin ...`. Later pushes can just be `git push`.)

Git may open a window asking you to sign in to GitHub. Sign in with your account.

### Step 7. Open a pull request

1. Open the project on GitHub: https://github.com/JGreyScales/C3L
2. A yellow banner shows **"Compare & pull request"**. Click it.
3. Fill in the short form (what you changed and which module). Tick the boxes that are true.
4. Click **Create pull request**.

### Step 8. Wait for the checks and the review

- GitHub runs the automatic checks. You want a **green tick**. A red cross means something needs
  fixing: click **Details** next to the red line to read why. Fix it on your computer, commit and
  push again. The pull request updates by itself.
- One of the admins reviews your pull request. They may **approve** it or **ask for changes**. If
  they ask for changes, change your code, commit, push again and tell them.
- When an admin approves and the checks are green, the pull request is merged into `main`.

### Step 9. After it is merged

```
git checkout main
git pull
```

Now start again from step 2 for your next task.

---

## 5. The rules

**Do**

- Work on a `feature/...` branch, always.
- Only change files **inside your own module folder** (`src/modules/<your-folder>`).
- Run `bun run check` before you push.
- Write commit messages that say what you changed.
- Ask an admin before you add a new library (`bun add ...`).

**Do not**

- Do not push to `main`. GitHub will refuse it anyway.
- Do not edit other teams' folders, even to "just fix a typo". Tell them instead.
- Do not edit `src/core`, `tests/app.test.ts`, `.github`, `package.json` or other files in the
  project's root. They hold the whole thing together. If you think something needs to change there,
  ask an admin.
- Do not rename your folder.
- Do not put passwords or secret keys in your code.

---

## 6. Add a page to your module

Open `src/modules/<your-folder>/index.ts`. It looks like this (shortened, this is Module 2):

```ts
import { Elysia } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'

const base = moduleBase(import.meta.dir)

export default defineModule({
  name: 'Module 2: Course Management',
  description: 'Courses, catalog, enrollment',

  router: new Elysia()
    .get('/', () => `<h1>Module 2: Course Management</h1> ...`)
    .get('/hello', () => `<h1>Hello from Module 2</h1><a href="${base}">Back</a>`),
})
```

The part that matters is the **router**. A *route* is one line that says: "when someone visits this
address, give them this HTML".

| In the code    | Means                                                                          |
|----------------|--------------------------------------------------------------------------------|
| `.get('/', ...)`      | The front page of your module (your button on the home page opens this) |
| `.get('/hello', ...)` | A page at `http://localhost:3000/<your-folder>/hello`                   |
| `base`                | Your own address, like `/02-courses`. Use it to build links.            |

### Add a new page: 3 steps

**1. Copy the `/hello` line** and paste it right below itself.

**2. Change the address and the HTML** in your copy.

**3. Fix the comma.** Only the **very last** route line ends with a comma. The ones above it do not.

Before:

```ts
    .get('/hello', () => `<h1>Hello from Module 2</h1><a href="${base}">Back</a>`),
})
```

After (a new `/catalog` page):

```ts
    .get('/hello', () => `<h1>Hello from Module 2</h1><a href="${base}">Back</a>`)
    .get('/catalog', () => `<h1>Course catalog</h1><a href="${base}">Back</a>`),
})
```

Save, then open **http://localhost:3000/02-courses/catalog** (with your own folder name). Done.

### Linking pages together

Always build links with `base`, so they work no matter where the project runs:

```ts
`<a href="${base}/catalog">Go to the catalog</a>`
```

To link back to the home page with all the buttons, use `<a href="/">`.

> **Backticks, not quotes.** The HTML goes between backticks `` ` `` (the key left of the 1).
> Backticks let you put `${base}` inside the text and write across several lines.

---

## 7. Other ways to return HTML

Your module only has to do one thing: **return a string of HTML** from a route. How you create that
string is up to your team. Here are three popular ways.

**A. Write it right in the route** (what you have been doing).

**B. Build it with a function** (good when many pages look alike):

```ts
function page(title: string, content: string): string {
  return `<!doctype html>
    <html>
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body>${content}<p><a href="/">All modules</a></p></body>
    </html>`
}

// ...inside the router:
.get('/catalog', () => page('Catalog', '<h1>Course catalog</h1>'))
```

**C. Keep the HTML in its own `.html` file** next to `index.ts`, and read it:

```ts
.get('/catalog', () => Bun.file(`${import.meta.dir}/catalog.html`).text())
```

A plain `.html` file cannot use `${base}`, so write the full address in its links
(like `/02-courses/catalog`).

**Other things you will probably need**

- **Forms and POST:** open `src/modules/_template/index.ts` and read the example at the bottom.
- **Data for other modules:** if a route returns an object (`() => ({ courses: [] })`), it is sent as
  JSON instead of HTML. Handy for routes that other modules call.
- **User text in your pages:** if you put text typed by a user into a page, wrap it in
  `escapeHtml(...)` (from `src/core/pages`) first, so nobody can sneak their own HTML in.
- **More about Elysia** (the library that handles routes): https://elysiajs.com

---

## 8. Check your work before you push

```
bun run check
```

This runs four checks, the same ones GitHub runs on your pull request:

| Check             | What it looks for                                                       | Command             |
|-------------------|-------------------------------------------------------------------------|---------------------|
| Lint              | Likely mistakes: unused variables, things that look wrong               | `bun run lint`      |
| Type check        | Type errors in your TypeScript                                          | `bun run typecheck` |
| Tests             | Your tests (and the project's) pass                                     | `bun run test`      |
| Module sanity     | Every module loads, and its front page (`/`) answers with HTML          | `bun run sanity`    |

If it reports problems, read the message, fix the file, and run it again.

**Easy fix for style problems:**

```
bun run fix
```

It tidies your formatting and fixes the simple lint problems for you. (Formatting alone never turns
your pull request red. It is only advice.)

---

## 9. Write a test

The course requires unit and integration tests, and `bun run check` runs them. Look at
`src/modules/_template/index.test.ts`. It is a complete small test:

```ts
import { expect, test } from 'bun:test'
import mod from './index'

const get = (path: string) => mod.router.handle(new Request(`http://localhost${path}`))

test('the front page answers 200', async () => {
  const response = await get('/')
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('Hello')
})
```

To add one to your module:

1. Create `index.test.ts` in **your** folder.
2. Copy the test above into it and change the checks to match your pages.
3. Run `bun run test`. Your tests run along with the others.

Inside the test, your router's addresses start at `/` (no folder name), so `get('/catalog')` tests
your catalog page.

---

## 10. Something went wrong

| What you see | What to do |
|--------------|------------|
| `bun: command not found` or `'bun' is not recognized` | Close the terminal (or VS Code) and open it again. Still broken? Run the Bun install line from step 2.2 again, then open a new terminal. |
| `git: command not found` | Install Git (step 2.1), then open a new terminal. |
| `bun run dev` says **port 3000 is busy** | Another copy is still running. Find the terminal where it runs and press Ctrl + C. Or use another port: Mac/Linux/Git Bash `PORT=3001 bun run dev`, Windows PowerShell `$env:PORT=3001; bun run dev`, Windows cmd `set PORT=3001 && bun run dev`. Then open `http://localhost:3001`. |
| The home page shows a **red card** for my module | The card tells you what is wrong. Common causes: no `export default defineModule({...})`, a typo in the code, or a missing `name`. Fix it, save, refresh. If the card stays, stop the site (Ctrl + C) and start it again. |
| My new page says **404** | Check the address (it is `/<your-folder>/<route>`), check you saved the file, and check the route line starts with `.get(`. |
| **Red squiggly lines** in VS Code | Usually a missing comma, a missing backtick or a missing `)`. Remember: only the last route line ends with a comma. |
| `bun run check` fails on **Lint** or **Type check** | Read the file name and line number in the message. Try `bun run fix` first, then run `bun run check` again. |
| `bun run check` fails on **Module sanity** | Your `/` route must exist and return HTML. The message says which. |
| `git push` says **protected branch** or **permission denied** on `main` | That is expected, nobody pushes to `main`. Make a branch (`git checkout -b feature/my-change`) and push that one. |
| `git push` says **no upstream branch** | Use the full command from step 6: `git push -u origin <your-branch-name>`. |
| `git pull` or `git merge` talks about a **conflict** | Two people changed the same lines. Do not delete things you do not understand. Ask an admin or a teammate to sit with you. (Because everyone works in their own folder, this should be rare.) |
| The pull request has a **red cross** | Click **Details** next to the red line. It says which check failed and why. Fix it locally, commit and push again. |
| Anything else | Copy the **whole error message** and ask your team or an admin. The whole message, not a description of it, makes problems much faster to solve. |

---

## 11. How the project fits together

You do not need this to do your work, but it is good to know.

```
C3L/
├── src/
│   ├── index.ts              starts the web server
│   ├── app.ts                builds the whole site
│   ├── core/                 the machinery. Admins only. Do not edit.
│   │   ├── defineModule.ts     what every module calls: defineModule({...})
│   │   ├── registry.ts         the helper that adds a module to the main router
│   │   ├── loadModules.ts      finds every folder in src/modules
│   │   ├── pages.ts            the home page with the buttons
│   │   └── ...
│   └── modules/              <-- YOUR WORK LIVES HERE
│       ├── _template/          copy-me folder (hidden from the home page)
│       ├── 01-identity-users/  Module 1
│       ├── 02-courses/         Module 2
│       ├── ...                 ...
│       └── 12-dashboard/       Module 12
├── tests/                    tests for the machinery
├── scripts/                  the sanity check
├── .github/                  automatic checks, pull request form, admin list
├── README.md                 this file
└── AI_README.md              the same story, for AI assistants
```

What happens when you start the site:

1. The app looks inside `src/modules` and opens every folder (except those starting with `_`).
2. Each folder's `index.ts` ends with `defineModule({ name, router })`.
3. A helper adds that router to the **main router**, under the folder's name
   (`02-courses` becomes `/02-courses`).
4. The helper also remembers the module, so the home page shows a button for it.
5. If a module is broken, the home page shows a red card for it and **all other modules keep
   working**.

Nobody ever has to edit a shared file to add their module. That is why teams almost never get
merge conflicts.

---

## 12. For the 4 admins

### 12.1 One-time setup

1. **Install and commit the lock file.** Run `bun install` once on your computer. It creates
   `bun.lock`. Commit it (through a pull request) so every student installs identical versions.
2. **Add the 4 admins to `.github/CODEOWNERS`.** Put the 4 GitHub usernames on the last line and
   remove the `# `. GitHub will then request a review from the admins on every pull request.
3. **Protect `main`.** On GitHub: **Settings > Rules > Rulesets > New ruleset > New branch ruleset**
   (older repositories may use **Settings > Branches > Add branch protection rule**). GitHub's
   wording changes now and then, but you want these settings:

   | Setting                                                       | Value                                             |
   |---------------------------------------------------------------|---------------------------------------------------|
   | Enforcement status                                            | Active                                            |
   | Target branches                                               | Default branch (`main`)                           |
   | Bypass list                                                   | Empty, so even admins go through pull requests    |
   | Restrict deletions                                            | On                                                |
   | Block force pushes                                            | On                                                |
   | Require a pull request before merging                         | On                                                |
   | ... Required approvals                                        | **1** (raise to 2 if you want it stricter)        |
   | ... Dismiss stale approvals when new commits are pushed       | On                                                |
   | ... Require review from Code Owners                           | On (once CODEOWNERS has the 4 admins)             |
   | ... Require conversation resolution before merging            | On                                                |
   | Require status checks to pass                                 | On, with the 4 checks below                       |
   | ... Require branches to be up to date before merging          | On                                                |

   **Required checks:** `Lint`, `Type check`, `Tests`, `Module sanity check`.
   They only appear in the dropdown after the CI workflow has run once, so open one pull request
   first (the one that adds `bun.lock` is perfect), then add them.

   **Leave `Formatting (advice only)` out.** It is deliberately not required, so style issues never
   block a student.

4. Optional: **Settings > General > Pull Requests > Automatically delete head branches** keeps the
   branch list tidy.

Students cannot push to `main` once the ruleset is active, and `main` only moves when one of the
admins approves a pull request whose checks are green.

### 12.2 Reviewing a pull request

1. Open the pull request and look at the **checks** at the bottom. Green means the code loads, the
   module's front page answers with HTML, and the tests pass. Red means send it back.
2. Open the **Files changed** tab. A normal pull request only touches **one folder** in
   `src/modules`. If it touches `src/core`, `.github`, `package.json` or another team's folder, ask
   why before approving.
3. Click **Review changes**, then **Approve** or **Request changes** (and say what to fix).

You cannot approve a pull request you opened yourself. Another admin has to.

### 12.3 What the automatic checks do

Defined in `.github/workflows/ci.yml`. They run on every pull request and on every push to `main`:

| Check                          | Runs                | Blocks merging? |
|--------------------------------|---------------------|-----------------|
| Lint                           | `bun run lint`      | Yes             |
| Type check                     | `bun run typecheck` | Yes             |
| Tests                          | `bun run test`      | Yes             |
| Module sanity check            | `bun run sanity`    | Yes             |
| Formatting (advice only)       | `bun run format:check` | No           |

The **module sanity check** is the one that protects the shared site: it loads every module and opens
its front page, and it writes any problem as a red message on the pull request. A test also fails if
one of the 12 module folders is renamed or deleted.

### 12.4 Changing the project

- **Add a 13th module:** copy `src/modules/_template`, rename the copy, restart the site.
- **Add a library:** `bun add <name>`, commit `package.json` and `bun.lock` through a pull request.
- **Change the port:** set `PORT` before `bun run dev` (see the troubleshooting table).

---

## 13. Glossary

| Word              | Meaning                                                                          |
|-------------------|----------------------------------------------------------------------------------|
| Terminal          | The window where you type commands                                               |
| Bun               | The program that runs the project (like Node.js, but faster and simpler)         |
| Elysia            | The library that handles web addresses and sends back pages                      |
| Route             | One line: "when someone visits this address, send them this"                     |
| Router            | A collection of routes. Every module has its own.                                |
| Module            | One of the 12 parts of the LMS. Each team builds one.                            |
| Git               | Tool that saves versions of the code and shares them                             |
| Branch            | Your own copy of the code to work on without disturbing anyone                   |
| Commit            | A saved snapshot of your changes, with a message                                 |
| Pull request (PR) | A request to merge your branch into `main`, so an admin can review it            |
| CI / checks       | Robots on GitHub that test your code on every pull request                       |
| Lint              | A tool that points out likely mistakes in code                                   |
| Merge conflict    | Two people changed the same lines and Git needs a human to choose                |
