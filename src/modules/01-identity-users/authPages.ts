// The HTML pages people actually use: create an account, log in, and see your own profile.
//
// There is no server-side session check in here. Each page is a plain HTML "shell" with a
// small <script> that calls this module's own JSON API with fetch(), exactly the way the
// front page tells OTHER modules to do it (see "Using it from another module" in pages.ts).
// The browser decides what to show by asking GET /api/me, so these pages stay as simple as
// everything else in this module.
import { STYLE } from './pages'

// Black text on white, black borders and buttons: on top of the shared STYLE from pages.ts,
// this is the part that makes forms and the profile card look right.
const FORM_STYLE = `
  body { background: #fff; color: #000; }
  a { color: #000; }
  .card { max-width: 440px; margin: 3rem auto; border: 1px solid #000; border-radius: 8px; padding: 2rem; }
  .card h1 { margin-top: 0; font-size: 1.4rem; }
  label { display: block; margin: 1rem 0 0.25rem; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #000; border-radius: 4px; font: inherit; }
  button { width: 100%; margin-top: 1.5rem; padding: 10px; background: #000; color: #fff; border: none; border-radius: 4px; font: inherit; cursor: pointer; }
  button:hover { background: #333; }
  button:disabled { background: #999; cursor: default; }
  .message { margin-top: 1rem; padding: 10px; border: 1px solid #000; border-radius: 4px; display: none; }
  .row { margin-top: 1rem; text-align: center; }
  .muted { color: #555; font-size: 0.85rem; }
  dl.profile dt { font-weight: 600; margin-top: 0.75rem; }
  dl.profile dd { margin: 0; }
  .pill { display: inline-block; padding: 2px 10px; border: 1px solid #000; border-radius: 999px; font-size: 0.8rem; text-transform: capitalize; }
`

/** Wraps a page's body and script in the same head/card layout. `base` is this module's address. */
function page(base: string, title: string, body: string, script: string): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>${STYLE}${FORM_STYLE}</style>
      </head>
      <body>
        <div class="card">${body}</div>
        <script>
          const BASE = ${JSON.stringify(base)}

          // Shows an error (black-on-light box) or a plain confirmation under a form.
          function showMessage(box, text, isError) {
            box.textContent = text
            box.style.background = isError ? '#f3f3f3' : '#fff'
            box.style.display = 'block'
          }

          ${script}
        </script>
      </body>
    </html>
  `
}

export function renderRegisterPage(base: string): string {
  const body = `
    <h1>Create an account</h1>
    <p class="muted">
      New accounts start as a Student. An Admin can change your role to Instructor or Admin
      afterwards, from <code>PUT /api/users/:id/role</code>.
    </p>
    <form id="register-form">
      <label for="name">Name</label>
      <input id="name" type="text" required autocomplete="name">

      <label for="email">Email</label>
      <input id="email" type="email" required autocomplete="email">

      <label for="password">Password</label>
      <input id="password" type="password" required minlength="8" autocomplete="new-password">

      <label for="confirm">Confirm password</label>
      <input id="confirm" type="password" required minlength="8" autocomplete="new-password">

      <button type="submit">Create account</button>
      <p id="message" class="message"></p>
    </form>
    <p class="row">Already have an account? <a href="${base}/login">Log in</a></p>
    <p class="row"><a href="${base}">Back to Module 1</a></p>
  `

  const script = `
    const form = document.getElementById('register-form')
    const message = document.getElementById('message')
    const button = form.querySelector('button')

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const name = document.getElementById('name').value.trim()
      const email = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value
      const confirm = document.getElementById('confirm').value

      if (password !== confirm) {
        showMessage(message, 'Passwords do not match.', true)
        return
      }

      button.disabled = true
      try {
        const response = await fetch(BASE + '/api/auth/sign-up/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        if (response.ok) {
          window.location.href = BASE + '/profile'
          return
        }
        const data = await response.json().catch(() => ({}))
        showMessage(message, data.message || 'Could not create the account.', true)
      } catch {
        showMessage(message, 'Network error. Please try again.', true)
      } finally {
        button.disabled = false
      }
    })
  `

  return page(base, 'Create an account - Module 1', body, script)
}

export function renderLoginPage(base: string): string {
  const body = `
    <h1>Log in</h1>
    <p id="reset-notice" class="message ok" style="display: none">
      Your password has been reset. Please log in.
    </p>
    <form id="login-form">
      <label for="email">Email</label>
      <input id="email" type="email" required autocomplete="email">

      <label for="password">Password</label>
      <input id="password" type="password" required autocomplete="current-password">

      <button type="submit">Log in</button>
      <p id="message" class="message"></p>
    </form>
    <p class="row"><a href="${base}/forgot-password">Forgot your password?</a></p>
    <p class="row">Need an account? <a href="${base}/register">Register</a></p>
    <p class="row"><a href="${base}">Back to Module 1</a></p>
  `

  const script = `
    // The reset-password page sends people here with ?reset=1 when it worked.
    if (new URLSearchParams(window.location.search).get('reset') === '1') {
      document.getElementById('reset-notice').style.display = 'block'
    }

    const form = document.getElementById('login-form')
    const message = document.getElementById('message')
    const button = form.querySelector('button')

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const email = document.getElementById('email').value.trim()
      const password = document.getElementById('password').value

      button.disabled = true
      try {
        const response = await fetch(BASE + '/api/auth/sign-in/email', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (response.ok) {
          window.location.href = BASE + '/profile'
          return
        }
        if (response.status === 403) {
          showMessage(message, 'This account has been deactivated.', true)
          return
        }
        const data = await response.json().catch(() => ({}))
        showMessage(message, data.message || 'Wrong email or password.', true)
      } catch {
        showMessage(message, 'Network error. Please try again.', true)
      } finally {
        button.disabled = false
      }
    })
  `

  return page(base, 'Log in - Module 1', body, script)
}

export function renderForgotPasswordPage(base: string): string {
  const body = `
    <h1>Forgot your password?</h1>
    <p class="muted">
      There is no email service in this school project: if the address has an account, a reset
      token is printed in the console where the server runs. Copy it into the
      <a href="${base}/reset-password">reset password</a> page.
    </p>
    <form id="forgot-form">
      <label for="email">Email</label>
      <input id="email" type="email" required autocomplete="email">

      <button type="submit">Send reset token</button>
      <p id="message" class="message"></p>
    </form>
    <p class="row">Already have a token? <a href="${base}/reset-password">Reset your password</a></p>
    <p class="row"><a href="${base}/login">Back to log in</a></p>
  `

  const script = `
    const form = document.getElementById('forgot-form')
    const message = document.getElementById('message')
    const button = form.querySelector('button')

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const email = document.getElementById('email').value.trim()

      button.disabled = true
      try {
        const response = await fetch(BASE + '/api/auth/request-password-reset', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (response.ok) {
          // Better Auth answers the same way whether or not the email has an account, on
          // purpose, so nobody can use this form to find out who is registered.
          showMessage(
            message,
            'If that email has an account, a reset token was printed in the server console.',
            false,
          )
          return
        }
        const data = await response.json().catch(() => ({}))
        showMessage(message, data.message || 'Please enter a valid email address.', true)
      } catch {
        showMessage(message, 'Network error. Please try again.', true)
      } finally {
        button.disabled = false
      }
    })
  `

  return page(base, 'Forgot password - Module 1', body, script)
}

export function renderResetPasswordPage(base: string): string {
  const body = `
    <h1>Reset your password</h1>
    <form id="reset-form">
      <label for="token">Reset token</label>
      <input id="token" type="text" required autocomplete="one-time-code">
      <p class="muted">Printed in the server console after "Forgot your password?".</p>

      <label for="password">New password</label>
      <input id="password" type="password" required minlength="8" autocomplete="new-password">

      <label for="confirm">Confirm new password</label>
      <input id="confirm" type="password" required minlength="8" autocomplete="new-password">

      <button type="submit">Reset password</button>
      <p id="message" class="message"></p>
    </form>
    <p class="row"><a href="${base}/forgot-password">Need a new token?</a></p>
    <p class="row"><a href="${base}/login">Back to log in</a></p>
  `

  const script = `
    // Pre-fills the token if it ever arrives as a link, e.g. ?token=abc123.
    const fromQuery = new URLSearchParams(window.location.search).get('token')
    if (fromQuery) document.getElementById('token').value = fromQuery

    const form = document.getElementById('reset-form')
    const message = document.getElementById('message')
    const button = form.querySelector('button')

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const token = document.getElementById('token').value.trim()
      const password = document.getElementById('password').value
      const confirm = document.getElementById('confirm').value

      if (password !== confirm) {
        showMessage(message, 'Passwords do not match.', true)
        return
      }

      button.disabled = true
      try {
        const response = await fetch(BASE + '/api/auth/reset-password', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        })
        if (response.ok) {
          window.location.href = BASE + '/login?reset=1'
          return
        }
        const data = await response.json().catch(() => ({}))
        showMessage(message, data.message || 'That token is invalid or expired.', true)
      } catch {
        showMessage(message, 'Network error. Please try again.', true)
      } finally {
        button.disabled = false
      }
    })
  `

  return page(base, 'Reset password - Module 1', body, script)
}

export function renderProfilePage(base: string): string {
  const body = `
    <h1>My profile</h1>
    <p id="loading" class="muted">Loading...</p>
    <div id="content" style="display: none">
      <dl class="profile">
        <dt>Name</dt><dd id="field-name"></dd>
        <dt>Email</dt><dd id="field-email"></dd>
        <dt>Role</dt><dd><span id="field-role" class="pill"></span></dd>
        <dt>Account</dt><dd id="field-active"></dd>
        <dt>Member since</dt><dd id="field-created"></dd>
      </dl>

      <form id="name-form">
        <label for="name">Change your name</label>
        <input id="name" type="text" required maxlength="100">
        <button type="submit">Save</button>
        <p id="message" class="message"></p>
      </form>

      <p class="row"><button id="logout" type="button">Log out</button></p>
    </div>
    <p class="row"><a href="${base}">Back to Module 1</a></p>
  `

  const script = `
    const loading = document.getElementById('loading')
    const content = document.getElementById('content')
    const message = document.getElementById('message')

    async function loadProfile() {
      const response = await fetch(BASE + '/api/me', { credentials: 'same-origin' })
      if (!response.ok) {
        window.location.href = BASE + '/login'
        return
      }
      const { user } = await response.json()
      document.getElementById('field-name').textContent = user.name
      document.getElementById('field-email').textContent = user.email
      document.getElementById('field-role').textContent = user.role
      document.getElementById('field-active').textContent = user.active ? 'Active' : 'Deactivated'
      document.getElementById('field-created').textContent =
        new Date(user.createdAt).toLocaleDateString()
      document.getElementById('name').value = user.name
      loading.style.display = 'none'
      content.style.display = 'block'
    }
    loadProfile()

    document.getElementById('name-form').addEventListener('submit', async (event) => {
      event.preventDefault()
      const name = document.getElementById('name').value.trim()
      const response = await fetch(BASE + '/api/me', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        document.getElementById('field-name').textContent = data.user.name
        showMessage(message, 'Saved.', false)
      } else {
        showMessage(message, data.error || 'Could not save your name.', true)
      }
    })

    document.getElementById('logout').addEventListener('click', async () => {
      await fetch(BASE + '/api/auth/sign-out', { method: 'POST', credentials: 'same-origin' })
      window.location.href = BASE + '/login'
    })
  `

  return page(base, 'My profile - Module 1', body, script)
}
