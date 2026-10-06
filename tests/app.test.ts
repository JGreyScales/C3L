import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Elysia } from 'elysia'
import { createApp, type MainApp } from '../src/app'
import { checkModules } from '../src/core/checkModules'
import { defineModule } from '../src/core/defineModule'
import { finishResponse } from '../src/core/finishResponse'
import { getLoadFailures, getRegisteredModules, registerModule } from '../src/core/registry'

// The 12 modules from the project brief. Their folder names are their web addresses,
// so renaming or deleting one would break links for everybody.
const EXPECTED_MODULE_FOLDERS = [
  '01-identity-users',
  '02-courses',
  '03-content',
  '04-assignments',
  '05-quizzes',
  '06-gradebook',
  '07-forum',
  '08-notifications',
  '09-analytics',
  '10-attendance',
  '11-calendar',
  '12-dashboard',
]

// Test modules are written into a temporary folder inside the repo (so they can find "elysia").
// The folder is deleted again when the tests finish.
const TMP = join(import.meta.dir, `.tmp-modules-${process.pid}`)
const DEFINE_MODULE_URL = pathToFileURL(join(import.meta.dir, '../src/core/defineModule.ts')).href

function writeModule(root: string, folder: string, source: string): void {
  mkdirSync(join(root, folder), { recursive: true })
  writeFileSync(join(root, folder, 'index.ts'), source)
}

/** Source code for a small, healthy module whose "/" route returns `body`. */
function healthyModule(name: string, body: string): string {
  return `
    import { Elysia } from 'elysia'
    import { defineModule } from '${DEFINE_MODULE_URL}'
    export default defineModule({
      name: ${JSON.stringify(name)},
      router: new Elysia().get('/', () => ${JSON.stringify(body)}),
    })
  `
}

const get = (app: MainApp, path: string) => app.fetch(new Request(`http://localhost${path}`))

afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('the real modules in src/modules', () => {
  test('all 12 module folders from the brief exist and load', async () => {
    const app = await createApp()
    const loaded = getRegisteredModules(app.router).map((mod) => mod.folder)
    for (const folder of EXPECTED_MODULE_FOLDERS) {
      expect(loaded).toContain(folder)
    }
  })

  test('every module loads and its front page answers 200 with HTML', async () => {
    const results = await checkModules()
    expect(results.filter((result) => !result.ok)).toEqual([])
  })

  test('the _template module works, so copies of it work too', async () => {
    const template = (await import('../src/modules/_template/index')).default
    const app = new Elysia()
    registerModule(app, { ...template, folder: 'template-copy', path: '/template-copy' })

    const request = new Request('http://localhost/template-copy')
    const response = await finishResponse(request, await app.handle(request))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })
})

describe('main app with healthy modules', () => {
  const root = join(TMP, 'healthy')
  let app: MainApp

  beforeAll(async () => {
    writeModule(root, 'alpha', healthyModule('Alpha Team', '<h1>Alpha front page</h1>'))
    writeModule(root, 'beta', healthyModule('Beta <Team>', '<h1>Beta front page</h1>'))
    app = await createApp({ modulesDir: root })
  })

  test('each module gets a fast-click button on the home page', async () => {
    const response = await get(app, '/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(html).toContain('href="/alpha"')
    expect(html).toContain('href="/beta"')
    expect(html).toContain('Alpha Team')
  })

  test('module names are escaped, so they cannot break the home page', async () => {
    const html = await (await get(app, '/')).text()
    expect(html).toContain('Beta &lt;Team&gt;')
    expect(html).not.toContain('Beta <Team>')
  })

  test('a string returned by a module is served as HTML', async () => {
    const response = await get(app, '/alpha')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('<h1>Alpha front page</h1>')
  })

  test('an unknown address gives a friendly 404 page', async () => {
    const response = await get(app, '/does-not-exist')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('Back to the home page')
  })
})

describe('main app with broken modules', () => {
  const root = join(TMP, 'broken')
  let app: MainApp

  beforeAll(async () => {
    writeModule(root, 'good', healthyModule('Good Module', '<h1>I still work</h1>'))
    writeModule(root, '_hidden', healthyModule('Hidden', '<h1>hidden</h1>'))
    writeModule(root, 'broken-syntax', 'export default defineModule({ name: "x", router: ')
    writeModule(root, 'no-default', 'export const nothing = 1')
    writeModule(
      root,
      'bad-router',
      `import { defineModule } from '${DEFINE_MODULE_URL}'
       export default defineModule({ name: 'Bad', router: 'not a router' })`,
    )
    writeModule(root, 'Bad Name', healthyModule('Bad Name', '<h1>x</h1>'))
    mkdirSync(join(root, 'no-index'), { recursive: true })
    writeFileSync(join(root, 'no-index', 'notes.txt'), 'there is no index.ts here')

    app = await createApp({ modulesDir: root })
  })

  test('one broken module does not stop the others', async () => {
    expect(getRegisteredModules(app.router).map((mod) => mod.folder)).toEqual(['good'])

    const response = await get(app, '/good')
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('I still work')
  })

  test('every broken folder is reported, and folders starting with _ are skipped', () => {
    const failed = getLoadFailures(app.router)
      .map((failure) => failure.folder)
      .sort()
    expect(failed).toEqual(['Bad Name', 'bad-router', 'broken-syntax', 'no-default', 'no-index'])
  })

  test('the home page explains what went wrong', async () => {
    const html = await (await get(app, '/')).text()
    expect(html).toContain('Modules that could not be loaded')
    expect(html).toContain('src/modules/no-default')
    expect(html).toContain('no default export')
    expect(html).not.toContain('Hidden')
  })
})

describe('the sanity check', () => {
  const root = join(TMP, 'sanity')

  test('flags a module whose front page is missing or is not HTML', async () => {
    writeModule(root, 'fine', healthyModule('Fine', '<h1>ok</h1>'))
    writeModule(
      root,
      'json-front',
      `import { Elysia } from 'elysia'
       import { defineModule } from '${DEFINE_MODULE_URL}'
       export default defineModule({ name: 'Json', router: new Elysia().get('/', () => ({ a: 1 })) })`,
    )
    writeModule(
      root,
      'no-front',
      `import { Elysia } from 'elysia'
       import { defineModule } from '${DEFINE_MODULE_URL}'
       export default defineModule({ name: 'None', router: new Elysia().get('/other', () => 'hi') })`,
    )

    const results = await checkModules(root)
    const byFolder = Object.fromEntries(results.map((result) => [result.folder, result]))

    expect(byFolder.fine?.ok).toBe(true)
    expect(byFolder['json-front']?.ok).toBe(false)
    expect(byFolder['json-front']?.problem).toContain('HTML')
    expect(byFolder['no-front']?.ok).toBe(false)
    expect(byFolder['no-front']?.problem).toContain('404')
  })
})

describe('registerModule and defineModule', () => {
  test('two modules cannot share a web address', () => {
    const app = new Elysia()
    const mod = {
      name: 'A',
      folder: 'a',
      path: '/a',
      router: new Elysia().get('/', () => 'x'),
    }

    registerModule(app, mod)
    expect(() => registerModule(app, { ...mod, folder: 'other' })).toThrow('/a')
  })

  test('defineModule explains a missing name or router', () => {
    expect(() => defineModule({ name: '   ', router: new Elysia() })).toThrow('name')
    expect(() => defineModule({ name: 'Ok', router: 'nope' as never })).toThrow('router')
  })
})

describe('finishResponse', () => {
  test('leaves JSON alone', async () => {
    const app = new Elysia().get('/data', () => ({ ok: true }))
    const request = new Request('http://localhost/data')
    const response = await finishResponse(request, await app.handle(request))

    expect(response.headers.get('content-type')).toContain('json')
    expect(await response.json()).toEqual({ ok: true })
  })

  test('shows a friendly page when a route crashes', async () => {
    const app = new Elysia().get('/boom', () => {
      throw new Error('kaboom')
    })
    const request = new Request('http://localhost/boom')
    const response = await finishResponse(request, await app.handle(request))

    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('kaboom')
  })
})
