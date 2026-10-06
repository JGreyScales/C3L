import type { Elysia } from 'elysia'
import type { LoadFailure, RegisteredModule } from './types'

/** Lowercase letters and numbers, optionally joined by "-" or "_". Example: 02-courses */
export const SAFE_NAME = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

/** A module's web address: "/" followed by a safe name. Example: /02-courses */
const SAFE_PATH = /^\/[a-z0-9]+(?:[-_][a-z0-9]+)*$/

// The home page asks these lists what to show. They are kept per main router.
const modulesByApp = new WeakMap<object, RegisteredModule[]>()
const failuresByApp = new WeakMap<object, LoadFailure[]>()

/**
 * The helper that plugs a module into the main router.
 *
 * It does two things:
 *   1. mounts the module's router under `mod.path`
 *   2. remembers the module so the home page can show its fast-click button
 */
export function registerModule(app: Elysia, mod: RegisteredModule): void {
  if (!SAFE_PATH.test(mod.path)) {
    throw new Error(
      `"${mod.path}" is not a valid web address. Use "/" followed by lowercase letters, numbers, "-" or "_".`,
    )
  }

  const modules = getModuleList(app)
  const clash = modules.find((existing) => existing.path === mod.path)
  if (clash) {
    throw new Error(
      `Two modules want the web address "${mod.path}": "${clash.folder}" and "${mod.folder}". Folder names must be different.`,
    )
  }

  // The router is cast because Elysia's `.use()` is stricter about its types than we need.
  app.group(mod.path, (scope) => scope.use(mod.router as unknown as Elysia))
  modules.push(mod)
}

/** Remember a module folder that failed to load so the home page can explain why. */
export function recordLoadFailure(app: Elysia, failure: LoadFailure): void {
  getFailureList(app).push(failure)
}

export function getRegisteredModules(app: Elysia): readonly RegisteredModule[] {
  return getModuleList(app)
}

export function getLoadFailures(app: Elysia): readonly LoadFailure[] {
  return getFailureList(app)
}

function getModuleList(app: Elysia): RegisteredModule[] {
  let list = modulesByApp.get(app)
  if (!list) {
    list = []
    modulesByApp.set(app, list)
  }
  return list
}

function getFailureList(app: Elysia): LoadFailure[] {
  let list = failuresByApp.get(app)
  if (!list) {
    list = []
    failuresByApp.set(app, list)
  }
  return list
}
