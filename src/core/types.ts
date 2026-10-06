/**
 * Anything that looks like an Elysia router.
 *
 * Elysia's own type is very strict about what it accepts, so we only ask for the one thing
 * we really need: a `handle` method. Every `new Elysia()` has it.
 */
export interface ModuleRouter {
  handle: (request: Request) => Promise<Response> | Response
}

/** What a module gives to `defineModule()`. */
export interface ModuleDefinition {
  /** The text on your button on the home page. */
  name: string
  /** Optional one-liner shown under the button. */
  description?: string
  /** Your Elysia router. Routes inside it are relative to `/<your-folder-name>`. */
  router: ModuleRouter
}

/** A module after the loader has decided its web address. */
export interface RegisteredModule extends ModuleDefinition {
  /** Web address prefix. Always `/<folder-name>`. */
  path: string
  /** The folder inside `src/modules` this module lives in. */
  folder: string
}

/** A module folder that could not be loaded. It is shown in red on the home page. */
export interface LoadFailure {
  folder: string
  message: string
}
