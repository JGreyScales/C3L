// The heart of the "middle man": takes a request that arrived at THIS server, sends the same
// request to ANOTHER server (the "target"), and gives the target's answer back to the caller.
//
// It only uses the standard Request / Response / fetch of Bun, so it works with any web framework
// and is easy to test on its own (forward.test.ts).

// Headers that belong to ONE network connection, not to the message.
// A middle man must not pass them on.
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

export interface ForwardOptions {
  /** Where requests go, without a trailing slash. Example: 'http://localhost:7000' */
  target: string
  /** Removed from the start of the address. Example: '/api' turns /api/users into /users */
  stripPrefix?: string
}

/** '/api/users' with prefix '/api' gives '/users'. '/apixyz' is not '/api/...', so it stays. */
function removePrefix(path: string, prefix: string): string {
  if (prefix === '') return path
  if (path === prefix) return '/'
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path
}

export async function forwardRequest(
  request: Request,
  { target, stripPrefix = '' }: ForwardOptions,
): Promise<Response> {
  const url = new URL(request.url)
  const targetUrl = target + removePrefix(url.pathname, stripPrefix) + url.search

  const headers = new Headers(request.headers)
  headers.delete('host') // fetch fills in the target's host
  headers.delete('content-length') // fetch works out the length of the body we send
  for (const name of HOP_BY_HOP) headers.delete(name)
  headers.set('x-forwarded-host', url.host) // lets the target know what the caller typed

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  try {
    const answer = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual', // pass redirects on to the caller instead of following them here
    })

    // fetch already unzipped the body, so "it is zipped" and "it is this long" are wrong now.
    const answerHeaders = new Headers(answer.headers)
    answerHeaders.delete('content-encoding')
    answerHeaders.delete('content-length')
    for (const name of HOP_BY_HOP) answerHeaders.delete(name)

    return new Response(answer.body, {
      status: answer.status,
      statusText: answer.statusText,
      headers: answerHeaders,
    })
  } catch {
    // The target is off, or the address is wrong.
    return Response.json({ error: 'Target unreachable', target: targetUrl }, { status: 502 })
  }
}
