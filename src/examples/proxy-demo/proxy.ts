// The middle man. Callers talk to THIS server. Everything under /api/ is passed on to the
// upstream router, and the answer comes back the same way.
//
//   caller --> GET http://localhost:3001/api/users?id=1
//   proxy  --> GET http://localhost:7000/users?id=1        (the "/api" part is removed)
//
// Run it (the upstream must be running too):  bun src/examples/proxy-demo/proxy.ts
import { Elysia } from 'elysia'
import { forwardRequest } from './forward'

// Elysia must not read the request body itself ('none'). Otherwise the body would be gone when
// forwardRequest wants to pass it on.
const rawBody = { parse: 'none' } as const

export function createProxy(target: string) {
  return new Elysia().all(
    '/api/*',
    ({ request }) => forwardRequest(request, { target, stripPrefix: '/api' }),
    rawBody,
  )
}

if (import.meta.main) {
  const target = process.env.UPSTREAM_URL ?? 'http://localhost:7000'
  const port = Number(process.env.PROXY_PORT ?? 3001)
  createProxy(target).listen(port)
  console.log(`Proxy running on http://localhost:${port}  ->  ${target}`)
}
