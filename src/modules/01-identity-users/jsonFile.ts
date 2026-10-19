// Keeps Better Auth's data in ONE .json file instead of a database.
//
// Better Auth keeps its tables (users, accounts, ...) in a plain JavaScript object. This file
// does two small jobs around that object:
//   1. loadTables()   reads the .json file into the object when the server starts.
//   2. withAutoSave() writes the object back to the file after every change.
//
// Nothing in here knows about Better Auth, so it is easy to test on its own.
import { mkdirSync, readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Every table is a list of rows (plain objects). */
export type Tables = Record<string, unknown[]>

/**
 * The tables that are written to the file.
 * Sessions are left out on purpose: a signed-in user is remembered by an encrypted cookie in
 * their browser, so the server has nothing to store (that is the "stateless" part).
 */
export const SAVED_TABLES = ['user', 'account', 'verification'] as const

/** The tables Better Auth expects to exist (it crashes if one is missing). */
const ALL_TABLES = [...SAVED_TABLES, 'session']

// JSON has no dates, so they are saved as text like "2026-10-13T17:00:00.000Z".
// Better Auth compares real Date objects (for example "has this token expired?"), so every
// field named like createdAt / updatedAt / expiresAt is turned back into a Date when loading.
const DATE_FIELD = /At$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

function reviveDates(key: string, value: unknown): unknown {
  if (typeof value === 'string' && DATE_FIELD.test(key) && ISO_DATE.test(value)) {
    return new Date(value)
  }
  return value
}

/** Reads the file. No file yet is fine (empty tables). A broken file throws, so it is not wiped. */
export function loadTables(file: string): Tables {
  const tables: Tables = {}
  for (const name of ALL_TABLES) tables[name] = []

  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return tables
    throw error
  }

  const saved: Record<string, unknown> = JSON.parse(text, reviveDates)
  for (const name of SAVED_TABLES) {
    const rows = saved[name]
    if (Array.isArray(rows)) tables[name] = rows
  }
  return tables
}

/**
 * Returns a function that writes the tables to the file.
 *  - Writes happen one after another, never two at once.
 *  - The data goes to a temporary file first and is then renamed, so a crash in the middle of
 *    a write can never leave a half-written users file behind.
 */
export function createSaver(file: string, tables: Tables): () => Promise<void> {
  let queue: Promise<void> = Promise.resolve()

  async function write(): Promise<void> {
    const data: Tables = {}
    for (const name of SAVED_TABLES) data[name] = tables[name] ?? []

    mkdirSync(dirname(file), { recursive: true })
    const temporaryFile = `${file}.tmp`
    // 0o600: only the owner can read the file (it holds password hashes).
    await writeFile(temporaryFile, JSON.stringify(data, null, 2), { mode: 0o600 })
    await rename(temporaryFile, file)
  }

  return () => {
    // `.catch` keeps one failed write from blocking all the writes after it.
    const run = queue.catch(() => undefined).then(write)
    queue = run
    return run
  }
}

// The adapter methods that change data. Reading methods (findOne, findMany, count) are not here.
const WRITE_METHODS = new Set([
  'create',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'consumeOne',
  'incrementOne',
  'transaction',
])

/** Wraps a Better Auth adapter so `save()` runs after every method that changes data. */
export function withAutoSave<T extends object>(adapter: T, save: () => Promise<void>): T {
  return new Proxy(adapter, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (typeof property !== 'string' || !WRITE_METHODS.has(property)) return value
      if (typeof value !== 'function') return value

      return async (...args: unknown[]) => {
        const result = await value.apply(target, args)
        await save()
        return result
      }
    },
  })
}
