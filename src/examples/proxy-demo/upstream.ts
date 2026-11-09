// The server that sits BEHIND the middle man. In a real project this is "the other router":
// another Elysia app, maybe another team's, maybe running in a Docker container.
//
// Run it:  bun src/examples/proxy-demo/upstream.ts
import { Elysia } from 'elysia'

const USERS = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Grace' },
]

function findUsers(id: string | undefined) {
  return id ? USERS.filter((user) => user.id === id) : USERS
}

export function createUpstream() {
  return new Elysia()
    .get('/hello', () => ({ message: 'Hello from the router behind the proxy' }))
    .get('/users', ({ query }) => findUsers(query.id))
    .post('/echo', ({ body }) => ({ youSent: body }))
}

if (import.meta.main) {
  const port = Number(process.env.UPSTREAM_PORT ?? 7000)
  createUpstream().listen(port)
  console.log(`Upstream router running on http://localhost:${port}`)
}
