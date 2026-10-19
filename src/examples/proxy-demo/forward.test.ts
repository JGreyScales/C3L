// Tests for the middle man's forwarding code. They start a tiny real server and forward to it.
// Run with:  bun run test
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { forwardRequest } from './forward'

let target = ''
let stopTarget: () => void = () => undefined

beforeAll(() => {
  // Port 0 means "any free port", so the test never clashes with something that is running.
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      if (url.pathname === '/teapot') return new Response('short and stout', { status: 418 })
      if (url.pathname === '/cookies') {
        const headers = new Headers()
        headers.append('set-cookie', 'a=1; Path=/')
        headers.append('set-cookie', 'b=2; Path=/')
        return new Response('ok', { headers })
      }
      // Everything else: describe the request we received.
      return Response.json({
        method: request.method,
        path: url.pathname,
        search: url.search,
        body: await request.text(),
        host: request.headers.get('host'),
        custom: request.headers.get('x-custom'),
        forwardedHost: request.headers.get('x-forwarded-host'),
      })
    },
  })
  target = `http://127.0.0.1:${server.port}`
  stopTarget = () => server.stop(true)
})

afterAll(() => stopTarget())

const send = (url: string, init?: RequestInit) =>
  forwardRequest(new Request(url, init), { target, stripPrefix: '/api' })

/** What the test server above tells us it received. */
interface Seen {
  method: string
  path: string
  search: string
  body: string
  host: string
  custom: string | null
  forwardedHost: string
}

const seenBy = async (answer: Response) => (await answer.json()) as Seen

describe('forwardRequest', () => {
  test('removes the prefix and keeps the query', async () => {
    const answer = await send('http://proxy.test/api/users?id=1')
    expect(answer.status).toBe(200)
    const seen = await seenBy(answer)
    expect(seen.path).toBe('/users')
    expect(seen.search).toBe('?id=1')
    expect(seen.method).toBe('GET')
  })

  test('only removes the prefix when it is a whole part of the address', async () => {
    const seen = await seenBy(await send('http://proxy.test/apixyz'))
    expect(seen.path).toBe('/apixyz')
    const root = await seenBy(await send('http://proxy.test/api'))
    expect(root.path).toBe('/')
  })

  test('can remove a longer prefix, like the one a module is mounted under', async () => {
    const request = new Request('http://proxy.test/02-courses/api/users?id=2')
    const answer = await forwardRequest(request, { target, stripPrefix: '/02-courses/api' })
    const seen = await seenBy(answer)
    expect(seen.path).toBe('/users')
    expect(seen.search).toBe('?id=2')
  })

  test('passes the method and the body on', async () => {
    const answer = await send('http://proxy.test/api/echo', { method: 'POST', body: '{"hi":1}' })
    const seen = await seenBy(answer)
    expect(seen.method).toBe('POST')
    expect(seen.body).toBe('{"hi":1}')
  })

  test('passes headers on, but the target sees its own host', async () => {
    const answer = await send('http://proxy.test/api/x', { headers: { 'x-custom': 'yes' } })
    const seen = await seenBy(answer)
    expect(seen.custom).toBe('yes')
    expect(seen.host).toBe(target.replace('http://', ''))
    expect(seen.forwardedHost).toBe('proxy.test')
  })

  test('gives back the status and body of the target', async () => {
    const answer = await send('http://proxy.test/api/teapot')
    expect(answer.status).toBe(418)
    expect(await answer.text()).toBe('short and stout')
  })

  test('keeps every cookie the target sets', async () => {
    const answer = await send('http://proxy.test/api/cookies')
    expect(answer.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=2; Path=/'])
  })

  test('answers 502 when the target is not running', async () => {
    const closed = Bun.serve({ port: 0, fetch: () => new Response('') })
    const deadTarget = `http://127.0.0.1:${closed.port}`
    closed.stop(true)

    const answer = await forwardRequest(new Request('http://proxy.test/api/x'), {
      target: deadTarget,
      stripPrefix: '/api',
    })
    expect(answer.status).toBe(502)
    expect(await answer.json()).toEqual({
      error: 'Target unreachable',
      target: `${deadTarget}/x`,
    })
  })
})
