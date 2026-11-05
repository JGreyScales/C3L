// Tests for the .json file storage. Run with:  bun run test
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSaver, loadTables, type Tables, withAutoSave } from './jsonFile'

// Every test gets its own folder inside one temporary folder, which is deleted at the end.
const root = mkdtempSync(join(tmpdir(), 'c3l-jsonfile-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

let file = ''
let counter = 0
beforeEach(() => {
  counter += 1
  file = join(root, `case-${counter}`, 'users.json')
})

describe('loadTables', () => {
  test('a missing file gives empty tables, including the session table', () => {
    const tables = loadTables(file)
    expect(tables).toEqual({ user: [], account: [], verification: [], session: [] })
  })

  test('a broken file throws instead of being treated as empty', async () => {
    await createSaver(file, loadTables(file))() // creates the folder and the file
    writeFileSync(file, '{ this is not json')

    expect(() => loadTables(file)).toThrow()
    // The broken file is still there, nothing wiped it.
    expect(readFileSync(file, 'utf8')).toBe('{ this is not json')
  })
})

describe('createSaver', () => {
  test('saves users, accounts and verifications, but not sessions', async () => {
    const tables = loadTables(file)
    tables.user.push({ id: 'u1', email: 'a@example.com' })
    tables.account.push({ id: 'a1', userId: 'u1' })
    tables.verification.push({ id: 'v1' })
    tables.session.push({ id: 's1', token: 'secret-session-token' })

    await createSaver(file, tables)()

    const text = readFileSync(file, 'utf8')
    expect(JSON.parse(text)).toEqual({
      user: [{ id: 'u1', email: 'a@example.com' }],
      account: [{ id: 'a1', userId: 'u1' }],
      verification: [{ id: 'v1' }],
    })
    expect(text).not.toContain('secret-session-token')
  })

  test('dates come back as real Date objects after loading', async () => {
    const tables = loadTables(file)
    tables.verification.push({ id: 'v1', expiresAt: new Date('2030-01-02T03:04:05.000Z') })
    await createSaver(file, tables)()

    const [row] = loadTables(file).verification as { expiresAt: Date }[]
    expect(row?.expiresAt).toBeInstanceOf(Date)
    expect(row?.expiresAt.toISOString()).toBe('2030-01-02T03:04:05.000Z')
  })

  test('many saves at the same time still leave one valid file and no temporary file', async () => {
    const tables = loadTables(file)
    const save = createSaver(file, tables)

    await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        tables.user.push({ id: `u${index}` })
        return save()
      }),
    )

    expect(loadTables(file).user).toHaveLength(20)
    expect(existsSync(`${file}.tmp`)).toBe(false)
  })
})

describe('withAutoSave', () => {
  function fakeAdapter(tables: Tables) {
    return {
      async create(row: { id: string }) {
        tables.user.push(row)
        return row
      },
      async findOne() {
        return tables.user[0] ?? null
      },
    }
  }

  test('saves after a method that changes data, and passes the result through', async () => {
    let saves = 0
    const adapter = withAutoSave(fakeAdapter(loadTables(file)), async () => {
      saves += 1
    })

    const created = await adapter.create({ id: 'u1' })

    expect(created).toEqual({ id: 'u1' })
    expect(saves).toBe(1)
  })

  test('does not save after reading', async () => {
    let saves = 0
    const adapter = withAutoSave(fakeAdapter(loadTables(file)), async () => {
      saves += 1
    })

    await adapter.findOne()

    expect(saves).toBe(0)
  })
})
