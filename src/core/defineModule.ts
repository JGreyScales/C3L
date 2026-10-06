import { basename } from 'node:path'
import type { ModuleDefinition } from './types'

/**
 * Every module file ends with `export default defineModule({ ... })`.
 *
 * It checks that you filled things in correctly and gives a readable error if you did not.
 * The main app then finds your module by itself, adds your router and puts a button on the
 * home page. You never have to touch a shared file.
 */
export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  // `Partial` because we are about to check that the module really filled everything in.
  const { name, description, router } = (definition ?? {}) as Partial<ModuleDefinition>

  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(
      'defineModule needs a "name". It is the text on your button. Example: name: "Module 1: Identity"',
    )
  }

  if (!router || typeof router.handle !== 'function') {
    throw new Error(
      'defineModule needs a "router". Example: router: new Elysia().get("/", () => "<h1>Hi</h1>")',
    )
  }

  return { name: name.trim(), description, router }
}

/**
 * Gives you your own web address so you can make links between your pages.
 * Call it like this at the top of your file: `const base = moduleBase(import.meta.dir)`.
 * If your folder is called `02-courses`, `base` is `"/02-courses"`.
 */
export function moduleBase(dir: string): string {
  return `/${basename(dir)}`
}
