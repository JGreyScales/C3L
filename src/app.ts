import { join } from 'node:path'
import { Elysia } from 'elysia'
import { finishResponse } from './core/finishResponse'
import { loadModules } from './core/loadModules'
import { renderIndexPage } from './core/pages'
import { getLoadFailures, getRegisteredModules } from './core/registry'

export const DEFAULT_MODULES_DIR = join(import.meta.dir, 'modules')

export interface MainApp {
  /** The main Elysia router. Every module is mounted on it. */
  router: Elysia
  /** Answer one request. This is what the server (and the tests) call. */
  fetch: (request: Request) => Promise<Response>
}

/**
 * Builds the whole website: the main router, every module from `src/modules`, and the home page.
 * Nothing here starts a server, so tests can call it freely.
 */
export async function createApp(options: { modulesDir?: string } = {}): Promise<MainApp> {
  const router = new Elysia()

  await loadModules(router, options.modulesDir ?? DEFAULT_MODULES_DIR)

  // The home page. It reads the module list when the page is opened.
  router.get('/', () => renderIndexPage(getRegisteredModules(router), getLoadFailures(router)))

  return {
    router,
    fetch: async (request) => finishResponse(request, await router.handle(request)),
  }
}
