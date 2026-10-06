import { renderErrorPage, renderNotFoundPage } from './pages'

const HTML = 'text/html; charset=utf-8'

/**
 * The last step before a response leaves the server.
 *
 * When a route returns a plain string, the browser would show the HTML tags as text, because
 * the response is labelled `text/plain` (or not labelled at all). This step relabels those
 * responses as `text/html`, so modules can simply `return "<h1>Hello</h1>"`.
 *
 * It also swaps the bare "NOT_FOUND" and crash messages for friendly pages.
 *
 * It looks at the finished response, so it works for every module, however that module built
 * its router. Everything that is labelled as something else (JSON, files, real HTML) and
 * everything without a body (redirects, 204) is left alone.
 */
export async function finishResponse(request: Request, response: Response): Promise<Response> {
  if (response.body === null) return response

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType !== '' && !contentType.startsWith('text/plain')) return response

  let body: BodyInit | null = response.body

  const isError = response.status === 404 || response.status >= 500
  if (isError) {
    // Read a copy, so the original body is still there if we decide to keep it.
    const text = await response.clone().text()
    const path = new URL(request.url).pathname

    if (response.status === 404 && text === 'NOT_FOUND') {
      body = renderNotFoundPage(path)
    } else if (response.status >= 500 && !text.trimStart().startsWith('<')) {
      body = renderErrorPage(path, text)
    }
  }

  const headers = new Headers(response.headers)
  headers.set('content-type', HTML)
  headers.delete('content-length')

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
