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

**How teams work together:** this repository is the **class repository** (we call it *upstream*).
Every team makes its own **fork** (a copy on GitHub), builds its module in the fork, and when the
work is ready it sends a **pull request** from the fork up to the class repository's `main` branch.
**Four admins review and approve every pull request.** Nobody pushes to the class repository directly.

```
   CLASS REPOSITORY  "upstream"          JGreyScales/C3L
        ▲                │              (admins approve pull requests into main)
        │ pull request   │ sync
        │ when ready     │ (fetch upstream, merge it into your fork)
        │                ▼
   YOUR TEAM'S FORK  "origin"            <fork-owner>/C3L
        ▲                │
        │ git push       │ git pull
        │                ▼
   YOUR COMPUTER                         the folder where you work
```

You do not need to know how the main app works. You only need to know **how to add a page to your
own module** (section 8) and **how to keep your fork up to date** (section 5).

> Using an AI assistant (Claude, Copilot, ChatGPT...)? Tell it to read **`AI_README.md`** first.
> It explains the project so the AI does not break things for the other teams.

---

## Contents

1. [Which module is mine?](#1-which-module-is-mine)
2. [Install the tools (once)](#2-install-the-tools-once)
3. [Set up your team's fork (once per team)](#3-set-up-your-teams-fork-once-per-team)
4. [Your everyday workflow (inside your fork)](#4-your-everyday-workflow-inside-your-fork)
5. [Keep your fork in sync with the class repository](#5-keep-your-fork-in-sync-with-the-class-repository)
6. [Send your work to the class repository](#6-send-your-work-to-the-class-repository)
7. [The rules](#7-the-rules)
8. [Add a page to your module](#8-add-a-page-to-your-module)
9. [Other ways to return HTML](#9-other-ways-to-return-html)
10. [Check your work before you push](#10-check-your-work-before-you-push)
11. [Write a test](#11-write-a-test)
12. [Something went wrong](#12-something-went-wrong)
13. [How the project fits together](#13-how-the-project-fits-together)
14. [For the 4 admins](#14-for-the-4-admins)
15. [Glossary](#15-glossary)

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

You need three things: **Git**, **Bun** and a code editor. Skip any you already have. You also need
a free **GitHub account**.

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
[Something went wrong](#12-something-went-wrong).

> **Tip: what is a terminal?** It is the window where you type commands. In VS Code, press
> **Ctrl + `** (the key above Tab) to open one at the bottom. It starts inside your project folder,
> which is exactly where you want it.

---

## 3. Set up your team's fork (once per team)

Your team works in its **own copy** of the project on GitHub, called a *fork*. One person does steps
3.1 and 3.2 for the whole team. Then **everyone** does steps 3.3 to 3.5.

### 3.1 One person makes the fork (the "fork owner")

1. Open https://github.com/JGreyScales/C3L and sign in to GitHub.
2. Click **Fork** (top right).
3. Leave **Owner** as your own account. Leave **Copy the `main` branch only** ticked.
4. Click **Create fork**.

You now have `https://github.com/<fork-owner>/C3L`, where `<fork-owner>` is the fork owner's GitHub
username. This is your team's fork. Write the address down. Everyone on the team needs it.

### 3.2 The fork owner invites the teammates

On the **fork** (not the class repository): **Settings > Collaborators > Add people**. Type each
teammate's GitHub username and send the invitation. Each teammate must **accept the invitation**
(GitHub emails them, or open https://github.com/notifications). Without it they cannot push.

### 3.3 Everyone downloads the fork, not the original

Copy the address of **your fork** (the green **Code** button on the fork's page), then:

```
git clone https://github.com/<fork-owner>/C3L.git
cd C3L
```

Now tell Git where the class repository is. We always call it `upstream`:

```
git remote add upstream https://github.com/JGreyScales/C3L.git
git remote -v
```

The last command prints four lines. Check them:

```
origin    https://github.com/<fork-owner>/C3L.git (fetch)     <- your team's fork
origin    https://github.com/<fork-owner>/C3L.git (push)
upstream  https://github.com/JGreyScales/C3L.git (fetch)      <- the class repository
upstream  https://github.com/JGreyScales/C3L.git (push)
```

This is the most important picture in the guide:

| Name       | Is                        | You can push to it?                    | Used for                                   |
|------------|---------------------------|----------------------------------------|--------------------------------------------|
| `origin`   | **Your team's fork**      | Yes                                    | Your daily work                            |
| `upstream` | **The class repository**  | **No.** Only admins approve changes    | Getting other teams' work, sending yours   |

### 3.4 Install and run

```
bun install
bun run dev
```

| Command                | What happens                                                         |
|------------------------|----------------------------------------------------------------------|
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

### 3.5 Switch on the automatic checks in your fork (fork owner, recommended)

GitHub keeps automatic checks switched off in new forks. On the fork, open the **Actions** tab and
click **I understand my workflows, go ahead and enable them**. After that, the checks also run on
the pull requests you make *inside* your team (section 4), so you find problems before the admins do.

---

## 4. Your everyday workflow (inside your fork)

Inside the team, the fork's `main` branch is **your team's shared version**. Nobody commits to it
directly. Changes get into it through a **pull request that a teammate reviews**. That gives you the
feature branches, pull requests and code reviews the course asks for.

> **Always check the address at the top of GitHub pages.** Pull requests made from a fork are
> pre-set to go to the **class repository**. Inside the team you must switch the target to **your
> fork**. Step 7 shows you where.

### Step 1. Start from the latest version

```
git checkout main
git pull
```

Then bring in the latest work from the class repository ([section 5](#5-keep-your-fork-in-sync-with-the-class-repository)).
Do this at least once every day you work.

### Step 2. Make your own branch

A branch is your private copy to work on. Give it a name that says what you are doing:

```
git checkout -b feature/course-catalog
```

(Always start the name with `feature/`, use lowercase and use `-` instead of spaces.)

### Step 3. Do your work

Edit files inside **your module folder**. Start the site with `bun run dev` and look at it in your
browser as you go.

### Step 4. Check your work

```
bun run check
```

It must finish without errors. [Section 10](#10-check-your-work-before-you-push) explains it.

### Step 5. Save your work (commit)

Add only **your folder**, then commit with a message that says what you changed:

```
git add src/modules/02-courses
git commit -m "Add course catalog page to module 2"
```

Good messages say what changed ("Add enrollment form to course page"). Bad messages say nothing
("stuff", "fix", "asdf"). Your teacher can see them.

You can do steps 3 to 5 as many times as you like.

### Step 6. Send it to your fork

```
git push -u origin feature/course-catalog
```

(Use your own branch name. The first push needs `-u origin ...`. Later pushes can just be `git push`.)

Git may open a window asking you to sign in to GitHub. Sign in with your account.

### Step 7. Open a pull request **inside your team**

1. Open **your fork** on GitHub: `https://github.com/<fork-owner>/C3L`.
2. Click **Compare & pull request** on the yellow banner.
3. **Stop and look at the top of the page.** It shows two dropdowns on the left:

   ```
   base repository: <fork-owner>/C3L   base: main     <-  head repository: <fork-owner>/C3L   compare: feature/course-catalog
   ```

   The **base repository must be your own fork**. If it says `JGreyScales/C3L`, click that
   dropdown and pick your fork. If you leave it, your half-finished work lands on the admins' desk.
4. Fill in the short form and click **Create pull request**.

### Step 8. A teammate reviews it

Ask a teammate to open the pull request, look at **Files changed**, and click **Review changes >
Approve** (or **Request changes** with a note). You cannot approve your own pull request.

If they ask for changes, change your code, commit and push again. The pull request updates itself.

### Step 9. Merge it and clean up

When it is approved and the checks are green, click **Merge pull request**. Then, on your computer:

```
git checkout main
git pull
git branch -d feature/course-catalog
```

Now start again from step 1 for your next task.

---

## 5. Keep your fork in sync with the class repository

The class repository (`upstream`) keeps changing: other teams' modules get merged, and admins fix
things. Your fork does **not** get those changes by itself. If you never sync, you build on an old
copy and get problems when you finally send your work up.

**Sync:**

- at the start of every day you work,
- before you open a pull request to the class repository ([section 6](#6-send-your-work-to-the-class-repository)),
- whenever an admin tells you "your branch is out of date".

You sync **your fork's `main`**. There are two ways. Use A if it works, otherwise B.

### Way A: with the button on GitHub (easiest)

1. Open **your fork** on GitHub: `https://github.com/<fork-owner>/C3L`.
2. Look under the green **Code** button. If it says **"This branch is N commits behind
   JGreyScales:main"**, you are out of date. Click **Sync fork**, then **Update branch**.
3. On your computer, bring it down:

   ```
   git checkout main
   git pull
   ```

> **Never click "Discard commits".** It throws away your team's work on `main`. If GitHub offers
> only that button (this happens when there are conflicts), use Way B.

### Way B: with commands (always works)

```
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

What they do:

| Command                   | Meaning                                                              |
|---------------------------|----------------------------------------------------------------------|
| `git checkout main`       | Switch to your `main` branch                                         |
| `git fetch upstream`      | Look at what is new in the class repository (changes nothing yet)    |
| `git merge upstream/main` | Add those new things to your `main`                                  |
| `git push origin main`    | Upload the result to your fork on GitHub                             |

If `git merge` says **Already up to date**, you are already in sync. Nothing to do.

> **A text editor opened and is asking for a "merge message"?** That is normal. Just save and close
> it. In VS Code, close the tab. In vim, type `:wq` and press Enter. In nano, press Ctrl + O, Enter,
> then Ctrl + X.

### Then update your feature branch

If you are in the middle of a feature, bring the fresh `main` into it:

```
git checkout feature/course-catalog
git merge main
```

Run `bun run check` afterwards to make sure everything still works.

### If Git says "CONFLICT"

A conflict means two people changed the same lines of the same file, and Git needs a human to pick.
Because every team works in its own folder, this should be rare. If it happens:

1. Run `git status`. Files marked **both modified** have the conflict.
2. Open one in VS Code. You will see blocks like this:

   ```
   <<<<<<< HEAD
   your version of the lines
   =======
   the other version of the lines
   >>>>>>> upstream/main
   ```

   Keep what should stay, then **delete the three marker lines** (`<<<<<<<`, `=======`, `>>>>>>>`).
3. Save the file, then:

   ```
   git add <the-file>
   git commit
   ```

4. Run `bun run check`.

If the conflict is in a file **outside your module folder**, or you are not sure what to keep, stop
and ask an admin. If you want to back out and start the sync again: `git merge --abort`.

### Why `merge`, and never `rebase` or `--force`?

`merge` only adds history, so it cannot destroy anything. `git rebase`, `git push --force` and
`git reset --hard` rewrite history and can delete your teammates' work. **Do not use them** unless an
admin tells you to.

---

## 6. Send your work to the class repository

When a meaningful, working piece of your module is ready in your fork's `main` (for example at the
end of a sprint), you send it up to the admins. Small and often is better than one giant pull
request at the end.

### Step 1. Make sure everything is in your fork's `main`

All your internal pull requests (section 4) should be merged.

### Step 2. Sync and check

Do [section 5](#5-keep-your-fork-in-sync-with-the-class-repository), then make sure your `main` is healthy:

```
git checkout main
git pull
bun run check
```

Fix anything it reports first (through a normal feature branch).

### Step 3. Open the pull request to the class repository

1. Open **your fork** on GitHub.
2. Click **Contribute > Open pull request**. (Or: open the class repository, **Pull requests >
   New pull request > compare across forks**.)
3. **Check the top of the page.** It must say:

   ```
   base repository: JGreyScales/C3L   base: main     <-  head repository: <fork-owner>/C3L   compare: main
   ```

   Class repository on the left, your fork on the right, `main` on both sides.
4. Look at **Files changed**. It should only show files in **your module folder**. If you see other
   teams' files or `src/core`, your fork is out of sync or you changed something you should not
   have. Stop and see [section 12](#12-something-went-wrong).
5. Fill in the form, keep **Allow edits by maintainers** ticked, and click **Create pull request**.

### Step 4. Wait for the checks and the review

- On your very first pull request, GitHub may say **"workflows awaiting approval"**. That is normal:
  an admin has to click **Approve and run workflows**. Message an admin if it sits there.
- You want a **green tick** on every check. A red cross: click **Details**, read why, fix it in your
  fork (through a feature branch and an internal pull request, as in section 4), and the pull
  request to the class repository **updates by itself**, because it follows your fork's `main`.
- An admin reviews it and **approves** or **requests changes**. When it is approved and green, an
  admin merges it into the class repository's `main`.

### Step 5. After it is merged

Sync your fork again ([section 5](#5-keep-your-fork-in-sync-with-the-class-repository)). Your merged work now
comes back down to you, together with everybody else's, and you carry on.

### Cheat sheet

| I want to...                                  | Do this                                                                       |
|-----------------------------------------------|-------------------------------------------------------------------------------|
| Get the newest class work into my fork        | Section 5: **Sync fork > Update branch**, or `git fetch upstream` + `git merge upstream/main` |
| Start a task                                  | `git checkout main`, `git pull`, `git checkout -b feature/<name>`             |
| Save my work                                  | `git add src/modules/<my-folder>`, `git commit -m "what changed"`            |
| Put my branch on GitHub                       | `git push -u origin feature/<name>`                                           |
| Get my work reviewed **by my team**           | Pull request, base = **my fork** (section 4, step 7)                         |
| Send my work **to the admins**                | Pull request, base = **JGreyScales/C3L** `main`, head = my fork `main` (section 6) |
| See where `origin` and `upstream` point       | `git remote -v`                                                               |

---

## 7. The rules

**Do**

- Work in **your team's fork**. You cannot (and should not) push to the class repository.
- Inside the fork: use a `feature/...` branch, and let a teammate review it before it is merged into
  your fork's `main`.
- **Sync** with `upstream` often.
- Only change files **inside your own module folder** (`src/modules/<your-folder>`).
- Run `bun run check` before you push.
- Write commit messages that say what you changed.
- Ask an admin before you add a new library (`bun add ...`).

**Do not**

- Do not commit straight to your fork's `main`. Use a branch and a pull request.
- Do not use `git push --force`, `git reset --hard` or `git rebase` unless an admin says so.
- Do not click **Discard commits** in the GitHub sync box.
- Do not edit other teams' folders, even to "just fix a typo". Tell them instead.
- Do not edit `src/core`, `tests/app.test.ts`, `.github`, `package.json` or other files in the
  project's root. They hold the whole thing together. If you think something needs to change there,
  ask an admin.
- Do not rename your folder.
- Do not put passwords or secret keys in your code.

---

## 8. Add a page to your module

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

## 9. Other ways to return HTML

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

## 10. Check your work before you push

```
bun run check
```

This runs four checks, the same ones GitHub runs on your pull requests:

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

## 11. Write a test

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

## 12. Something went wrong

### Setting up and running

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

### Forks, syncing and pull requests

| What you see | What to do |
|--------------|------------|
| `fatal: 'upstream' does not appear to be a git repository` | You have not added the class repository yet. Run `git remote add upstream https://github.com/JGreyScales/C3L.git` (step 3.3). |
| `error: remote upstream already exists` | Fine, it is already set up. Run `git remote -v` to check it points to `JGreyScales/C3L`. |
| `git push` says **permission denied** or **403** | Either you have not accepted the fork invitation (step 3.2), or you cloned the **class repository** instead of the fork. Run `git remote -v`: `origin` must show your fork owner's name. If it shows `JGreyScales`, fix it with `git remote rename origin upstream` and then `git remote add origin https://github.com/<fork-owner>/C3L.git`. |
| `git push` says **rejected** or **fetch first** | A teammate pushed first. Run `git pull`, then `git push` again. |
| `git push` says **no upstream branch** | Use the full command from section 4, step 6: `git push -u origin <your-branch-name>`. |
| GitHub only offers **Discard commits** when I try to sync | Do **not** click it. Use "Way B: with commands" in section 5. |
| `git merge upstream/main` talks about a **conflict** | Follow "If Git says CONFLICT" in section 5. Cannot work it out? Run `git merge --abort` and ask an admin. |
| A text editor opened during `git merge` | Normal. Save and close it (vim: `:wq` and Enter). |
| My pull request to the class repository shows **other teams' files or lots of commits** | Your fork is out of date, or something was changed outside your folder. Sync first (section 5). Still wrong? Ask an admin before you push more. |
| I made a pull request but it went to the **wrong repository** | Close it (button at the bottom of the pull request) and open a new one, checking the base repository dropdown (section 4 step 7, section 6 step 3). |
| My pull request says **"workflows awaiting approval"** | Normal for the first pull request. An admin has to click **Approve and run workflows**. Message one. |
| The pull request has a **red cross** | Click **Details** next to the red line. It says which check failed and why. Fix it in your fork, commit and push again. |
| Anything else | Copy the **whole error message** and ask your team or an admin. The whole message, not a description of it, makes problems much faster to solve. |

---

## 13. How the project fits together

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
merge conflicts, even though 12 forks feed into one repository.

---

## 14. For the 4 admins

### 14.1 One-time setup

1. **Install and commit the lock file.** Run `bun install` once on your computer. It creates
   `bun.lock`. Commit it (through a pull request) so every team installs identical versions.
2. **Add the 4 admins to `.github/CODEOWNERS`.** Put the 4 GitHub usernames on the last line and
   remove the `# `. GitHub will then request a review from the admins on every pull request.
3. **Check that forking is allowed.** The repository is public, so forks are allowed. If it is ever
   made private, switch on **Settings > General > Allow forking**.
4. **Decide how fork pull requests run the checks.** On **Settings > Actions > General**, under
   **Fork pull request workflows from outside collaborators**, the default is **Require approval for
   first-time contributors**. You will see a yellow **Approve and run workflows** button on a team's
   first pull request. Choose **Require approval for all outside collaborators** if you want to
   approve every run. The workflow only has read access and uses no secrets, so approving is safe,
   but still glance at what the pull request changes first.
5. **Allow only merge commits.** On **Settings > General > Pull Requests**, tick **Allow merge
   commits** and untick **Allow squash merging** and **Allow rebase merging**. Teams keep working
   on their fork's `main` after a pull request is merged. Squash and rebase rewrite their history,
   and their next sync then produces needless conflicts. A merge commit keeps every fork in step.
6. **Protect `main`.** On GitHub: **Settings > Rules > Rulesets > New ruleset > New branch ruleset**
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
   | ... Allowed merge methods                                     | Merge only                                        |
   | Require status checks to pass                                 | On, with the 4 checks below                       |
   | ... Require branches to be up to date before merging          | **Off** (see the note below)                      |

   **Required checks:** `Lint`, `Type check`, `Tests`, `Module sanity check`.
   They only appear in the dropdown after the CI workflow has run once, so open one pull request
   first (the one that adds `bun.lock` is perfect), then add them.

   **Leave `Formatting (advice only)` out.** It is deliberately not required, so style issues never
   block a student.

   **Why "up to date" is off:** with 12 teams merging into `main`, that setting forces every other
   team to re-sync after each merge before it can merge itself. The checks already run on the result
   of merging the pull request into the current `main`, and modules live in separate folders, so
   conflicts are rare. Turn it on if you prefer the stricter rule and accept the queue.
7. Optional: **Settings > General > Pull Requests > Automatically delete head branches** keeps the
   branch list tidy. (It only affects branches in this repository, not in the forks.)

Students cannot push to `main` (they only have read access to this repository), and `main` only
moves when one of the admins approves a pull request whose checks are green.

### 14.2 Reviewing a pull request from a team's fork

1. Open the pull request. The header says where it comes from, like
   `team-fork-owner wants to merge N commits into JGreyScales:main from team-fork-owner:main`.
2. If the checks say **awaiting approval**, click **Approve and run workflows** (see 14.1 step 4).
   Green means the code loads, the module's front page answers with HTML, and the tests pass. Red
   means send it back.
3. Open the **Files changed** tab. A normal pull request only touches **one folder** in
   `src/modules`. If it touches `src/core`, `.github`, `package.json` or another team's folder, ask
   why before approving. Lots of unrelated files usually means the team did not sync first: ask them
   to sync (README section 5) and look again.
4. Click **Review changes**, then **Approve** or **Request changes** (and say what to fix). Teams fix
   things in their fork and the pull request updates itself.
5. When it is approved and green, merge with **Create a merge commit** (the only option, if you
   followed 14.1 step 5).

You cannot approve a pull request you opened yourself. Another admin has to.

### 14.3 What the automatic checks do

Defined in `.github/workflows/ci.yml`. They run on every pull request (including the ones from forks
and the ones teams make inside their own fork, once the fork owner enabled Actions) and on every push
to `main`:

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

### 14.4 Changing the project

- **Add a 13th module:** copy `src/modules/_template`, rename the copy, and send it through a pull
  request like any other change. Teams get it the next time they sync.
- **Fix something in `src/core` or the CI:** same, through a pull request. Tell the teams to sync.
- **Add a library:** `bun add <name>`, commit `package.json` and `bun.lock` through a pull request.
- **Change the port:** set `PORT` before `bun run dev` (see the troubleshooting table).

---

## 15. Glossary

| Word              | Meaning                                                                          |
|-------------------|----------------------------------------------------------------------------------|
| Terminal          | The window where you type commands                                               |
| Bun               | The program that runs the project (like Node.js, but faster and simpler)         |
| Elysia            | The library that handles web addresses and sends back pages                      |
| Route             | One line: "when someone visits this address, send them this"                     |
| Router            | A collection of routes. Every module has its own.                                |
| Module            | One of the 12 parts of the LMS. Each team builds one.                            |
| Git               | Tool that saves versions of the code and shares them                             |
| Fork              | Your team's own copy of the class repository, on GitHub                          |
| Upstream          | The class repository (`JGreyScales/C3L`). Where admins approve work.             |
| Origin            | Your team's fork. Where you push your daily work.                                |
| Sync              | Bringing the newest work from upstream into your fork                            |
| Branch            | Your own line of work, so you do not disturb anyone                              |
| Commit            | A saved snapshot of your changes, with a message                                 |
| Pull request (PR) | A request to merge one branch into another, so someone can review it first       |
| Base / head       | In a pull request: **base** is where the changes go, **head** is where they come from |
| CI / checks       | Robots on GitHub that test your code on every pull request                       |
| Lint              | A tool that points out likely mistakes in code                                   |
| Merge conflict    | Two people changed the same lines and Git needs a human to choose                |
