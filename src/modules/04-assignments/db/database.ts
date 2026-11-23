import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DEFAULT_PATH = `${import.meta.dir}/../data/assignments.db`
const schema = await Bun.file(`${import.meta.dir}/schema.sql`).text()

/** Opens the SQLite database and ensures the Module 4 tables exist. */
export function createDatabase(path: string = DEFAULT_PATH): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })

  const database = new Database(path, { create: true })
  database.exec('PRAGMA foreign_keys = ON')
  database.exec(schema)
  return database
}

/** Tests never touch local demo data. Production uses one shared connection. */
export const db = createDatabase(
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : (process.env.M04_DB_PATH ?? DEFAULT_PATH),
)
