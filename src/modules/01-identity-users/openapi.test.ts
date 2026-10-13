// Tests for the API description that Swagger UI shows. Run with:  bun run test
import { describe, expect, test } from 'bun:test'
import { ENDPOINTS } from './endpoints'
import { buildOpenApi } from './openapi'
import { renderDocsPage, renderFrontPage } from './pages'
import { ROLES } from './roles'

const BASE = '/01-identity-users'

interface Operation {
  parameters?: { name: string; in: string; required: boolean; schema: { type: string } }[]
  requestBody?: {
    content: {
      'application/json': {
        schema: { required: string[]; properties: Record<string, { enum?: string[] }> }
      }
    }
  }
  responses: Record<string, unknown>
}

const spec = buildOpenApi(BASE)
const paths = spec.paths as Record<string, Record<string, Operation>>

/** The way OpenAPI writes an address: ":id" becomes "{id}", and the module folder goes in front. */
const openApiPath = (path: string) => `${BASE}${path.replace(/:(\w+)/g, '{$1}')}`

describe('the OpenAPI description', () => {
  test('it is an OpenAPI 3 document', () => {
    expect(spec.openapi).toBe('3.0.3')
    expect(spec.info.title).toContain('Identity')
  })

  test('every endpoint in the list is described, under the module address', () => {
    for (const endpoint of ENDPOINTS) {
      const operation = paths[openApiPath(endpoint.path)]?.[endpoint.method]
      expect(operation).toBeDefined()
      expect(operation?.responses['200']).toBeDefined()
    }
  })

  test('no endpoint is listed twice', () => {
    const names = ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`)
    expect(new Set(names).size).toBe(names.length)
  })

  test('the part of an address that changes becomes a path parameter', () => {
    const operation = paths[`${BASE}/api/users/{id}/role`]?.put
    expect(operation?.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ])
  })

  test('a body lists all its fields as required, and the role choices match the real roles', () => {
    const schema =
      paths[`${BASE}/api/users/{id}/role`]?.put?.requestBody?.content['application/json'].schema
    expect(schema?.required).toEqual(['role'])
    expect(schema?.properties.role?.enum).toEqual([...ROLES])
  })

  test('the User description knows the roles', () => {
    expect(spec.components.schemas.User.properties.role.enum).toEqual([...ROLES])
  })
})

describe('the pages', () => {
  test('the front page shows every endpoint and links to the docs', () => {
    const html = renderFrontPage(BASE)
    for (const endpoint of ENDPOINTS) expect(html).toContain(`${BASE}${endpoint.path}`)
    expect(html).toContain(`${BASE}/docs`)
  })

  test('the docs page points Swagger UI at the description', () => {
    const html = renderDocsPage(BASE)
    expect(html).toContain('SwaggerUIBundle')
    expect(html).toContain(`${BASE}/openapi.json`)
  })
})
