// Builds the OpenAPI document (the machine-readable description of the endpoints) that
// Swagger UI shows. It is made from the list in endpoints.ts, so there is only one list to keep.
import { type Endpoint, ENDPOINTS, type Field } from './endpoints'
import { ROLES } from './roles'

const USER_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', description: 'Only shown to admins and to the user themself.' },
    role: { type: 'string', enum: [...ROLES] },
    active: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

const USER_REF = { $ref: '#/components/schemas/User' }

/** "/api/users/:id/role" becomes "/api/users/{id}/role", the way OpenAPI writes it. */
function openApiPath(base: string, path: string): string {
  return `${base}${path}`.replace(/:(\w+)/g, '{$1}')
}

function fieldSchema(field: Field) {
  return {
    type: field.type,
    example: field.example,
    ...(field.allowed ? { enum: [...field.allowed] } : {}),
  }
}

function successResponse(returns: Endpoint['returns']) {
  if (!returns) return { description: 'Success.' }
  const schema =
    returns === 'user'
      ? { type: 'object', properties: { user: USER_REF } }
      : { type: 'object', properties: { users: { type: 'array', items: USER_REF } } }
  return { description: 'Success.', content: { 'application/json': { schema } } }
}

function operation(endpoint: Endpoint) {
  const pathParameters = [...endpoint.path.matchAll(/:(\w+)/g)].map((match) => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }))

  const responses: Record<string, unknown> = { '200': successResponse(endpoint.returns) }
  for (const [status, meaning] of Object.entries(endpoint.errors)) {
    responses[status] = { description: meaning }
  }

  return {
    tags: [endpoint.tag],
    summary: endpoint.summary,
    description: `${endpoint.description}\n\nWho can call it: **${endpoint.who}**.`,
    parameters: pathParameters.length > 0 ? pathParameters : undefined,
    requestBody: endpoint.body
      ? {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: Object.keys(endpoint.body),
                properties: Object.fromEntries(
                  Object.entries(endpoint.body).map(([name, field]) => [name, fieldSchema(field)]),
                ),
              },
            },
          },
        }
      : undefined,
    responses,
  }
}

/** `base` is the module's address, for example "/01-identity-users". */
export function buildOpenApi(base: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const endpoint of ENDPOINTS) {
    const path = openApiPath(base, endpoint.path)
    paths[path] = { ...paths[path], [endpoint.method]: operation(endpoint) }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'C3L Module 1: Identity & User Management',
      version: '1.0.0',
      description:
        'Everything returns JSON. Start with "Register" or "Sign in" below: the browser keeps the login cookie, and "Try it out" sends it along on the other calls.',
    },
    servers: [{ url: '/' }],
    tags: [
      {
        name: 'Auth',
        description: 'Register, sign in and out, passwords (answered by Better Auth)',
      },
      { name: 'Profile', description: 'The signed-in user' },
      { name: 'Users', description: 'Look up users, and admin tools for roles and activation' },
    ],
    paths,
    components: { schemas: { User: USER_SCHEMA } },
  }
}
