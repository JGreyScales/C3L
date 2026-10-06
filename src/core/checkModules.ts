import { createApp, DEFAULT_MODULES_DIR } from '../app'
import { getLoadFailures, getRegisteredModules } from './registry'
import type { RegisteredModule } from './types'

export interface ModuleCheck {
  folder: string
  ok: boolean
  /** Plain-English explanation when `ok` is false. */
  problem?: string
}

/**
 * The sanity check every module has to pass:
 *   1. the folder loads (right name, index.ts, `export default defineModule(...)`)
 *   2. opening the module's address (its "/" route) answers 200 and returns HTML
 *
 * Used by `bun run sanity` and by the tests, so CI can tell a team what is wrong before
 * their work is merged.
 */
export async function checkModules(
  modulesDir: string = DEFAULT_MODULES_DIR,
): Promise<ModuleCheck[]> {
  const app = await createApp({ modulesDir })

  const results: ModuleCheck[] = getLoadFailures(app.router).map((failure) => ({
    folder: failure.folder,
    ok: false,
    problem: failure.message,
  }))

  for (const mod of getRegisteredModules(app.router)) {
    results.push(await checkRootRoute(app.fetch, mod))
  }

  return results.sort((a, b) => a.folder.localeCompare(b.folder))
}

async function checkRootRoute(
  fetch: (request: Request) => Promise<Response>,
  mod: RegisteredModule,
): Promise<ModuleCheck> {
  try {
    const response = await fetch(new Request(`http://localhost${mod.path}`))
    const contentType = response.headers.get('content-type') ?? 'nothing'

    if (response.status !== 200) {
      return {
        folder: mod.folder,
        ok: false,
        problem: `Opening ${mod.path} answered with status ${response.status}, but it must answer 200. Does your router have a route for "/"?`,
      }
    }

    if (!contentType.includes('html')) {
      return {
        folder: mod.folder,
        ok: false,
        problem: `Opening ${mod.path} must return HTML, but it returned "${contentType}". Return a string of HTML from your "/" route.`,
      }
    }

    return { folder: mod.folder, ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      folder: mod.folder,
      ok: false,
      problem: `Opening ${mod.path} crashed: ${message}`,
    }
  }
}
