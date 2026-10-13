# Module 1: Identity & User Management

Email + password accounts with roles (student, instructor, admin), built on
[Better Auth](https://www.better-auth.com). Everything is an endpoint that returns JSON, so the
other modules can use it. The list of endpoints is on the module's front page,
`http://localhost:3000/01-identity-users`, and you can try them in Swagger UI at
`http://localhost:3000/01-identity-users/docs` (it loads from a CDN, so the browser needs
internet). The raw description is at `/01-identity-users/openapi.json`.

## One-time setup

This module needs the `better-auth` package. Adding a dependency changes `package.json` and
`bun.lock`, which are outside this folder, so an admin has to approve it:

```
bun add better-auth
```

## How it works

- **No database.** Users and password hashes are saved in `data/users.json` (created on the
  first registration, ignored by git, readable only by you). Passwords are hashed, not stored
  as plain text.
- **Stateless sessions.** After signing in, the browser holds an encrypted cookie that is good
  for 7 days. The server keeps no session list, so restarting the server does not sign anyone out.
- **First account = admin.** The very first person to register becomes an admin and can promote
  or deactivate everybody else. Everyone after that is a student.
- **Password reset.** There is no email service. `POST /api/auth/request-password-reset` prints
  the reset token in the console where the server runs. Use it with `POST /api/auth/reset-password`.
- **Roles and deactivation take effect at once.** A cookie cannot be taken back from a browser,
  so `GET /api/me` and the admin routes only read the user's id from the cookie and look the rest
  (role, active) up in `users.json`. Other modules should call `GET /api/me` to check a login.
  A deactivated account gets `401` from `/api/me` and cannot sign in.

## School project shortcuts (change these for a real website)

- The secret that signs and encrypts the cookies is written directly in `auth.ts`.
- Reset tokens are printed to the console instead of being emailed.
- Signing out clears the cookie in the browser, but a copy of the old cookie keeps working until
  it expires (that is the price of not storing sessions).
- After a server restart, `POST /api/auth/change-password` needs a fresh sign-in first. Better
  Auth checks its own (empty after a restart) session list for that one.

## Files

| File | What it does |
|------|--------------|
| `index.ts` | The module definition (name, router, where the users file lives) |
| `router.ts` | The routes: `/api/auth/*`, `/api/me`, `/api/users/...`, `/docs`, `/openapi.json` and the front page |
| `endpoints.ts` | The list of endpoints. It feeds the front page table and Swagger UI. **Update it when you add a route** |
| `openapi.ts` | Turns that list into the OpenAPI description Swagger UI shows |
| `auth.ts` | The Better Auth settings: email + password, secret |
| `roles.ts` | The three roles |
| `jsonFile.ts` | Saves and loads the users file |
| `pages.ts` | The front page and the Swagger UI page |
| `*.test.ts` | Tests (`bun run test`). They use a temporary users file |
