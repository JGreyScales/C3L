import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Elysia } from 'elysia'
import { defineModule } from './defineModule'
import { recordLoadFailure, registerModule, SAFE_NAME } from './registry'
import type { RegisteredModule } from './types'

const ENTRY_FILES = ['index.ts', 'index.js']

/**
 * Looks at every folder inside `src/modules` and plugs each one into the main router.
 *
 * - Folders starting with "_" or "." are skipped (that is how `_template` stays hidden).
 * - The folder name becomes the web address: `src/modules/02-courses` -> `/02-courses`.
 * - If one module is broken, it is reported on the home page. The other modules keep working.
 */
export async function loadModules(app: Elysia, modulesDir: string): Promise<void> {
  const folders = readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .sort()

  for (const folder of folders) {
    try {
      registerModule(app, await loadOne(modulesDir, folder))
    } catch (error) {
      const message = describeError(error)
      recordLoadFailure(app, { folder, message })
      console.warn(`\n[C3L] Could not load the module in "${folder}":\n${message}\n`)
    }
  }
}

async function loadOne(modulesDir: string, folder: string): Promise<RegisteredModule> {
  if (!SAFE_NAME.test(folder)) {
    throw new Error(
      `The folder name "${folder}" is not allowed. Use only lowercase letters, numbers, "-" and "_" (example: 02-courses).`,
    )
  }

  const entry = ENTRY_FILES.map((file) => join(modulesDir, folder, file)).find((file) =>
    existsSync(file),
  )
  if (!entry) {
    throw new Error(
      `There is no index.ts inside "${folder}". Every module needs a file called index.ts.`,
    )
  }

  const imported = await import(pathToFileURL(entry).href)
  if (!imported.default) {
    throw new Error(
      'index.ts has no default export. The file must contain: export default defineModule({ ... })',
    )
  }

  // Check again here, in case someone exported a plain object instead of calling defineModule.
  const definition = defineModule(imported.default)
  return { ...definition, path: `/${folder}`, folder }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return String(error)
}
