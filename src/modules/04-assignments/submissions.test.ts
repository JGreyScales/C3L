import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from './db/database'
import { saveAssignment } from './db/repository'
import { createSubmissionStore, MAX_FILE_BYTES } from './submissions'

const dir = mkdtempSync(join(tmpdir(), 'm04-submission-tests-'))
const database = createDatabase(':memory:')
saveAssignment(database, { id: 'a1', courseId: '1', title: 'Demo', description: 'Demo', dueAt: '2030-11-23T17:00:00Z', maxAttempts: 3, createdBy: 'teacher' })
const store = createSubmissionStore(database, dir)
afterAll(() => { database.close(); rmSync(dir, { recursive: true, force: true }) })

describe('submission storage and validation', () => {
  test('stores file bytes, timestamp and assignment-specific receipt', async () => {
    const result = await store.submit('a1', new File(['demo'], 'demo.txt'), 'alice')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { id, filePath, submittedAt } = result.submission
    expect(await Bun.file(filePath).text()).toBe('demo')
    expect(Number.isFinite(Date.parse(submittedAt))).toBe(true)
    expect(store.find('a1', id)).toEqual(result.submission)
    expect(store.find('a2', id)).toBeUndefined()
  })
  test('accepts file at size limit', async () => {
    expect((await store.submit('a1', new File([new Uint8Array(MAX_FILE_BYTES)], 'demo.PDF'), 'bob')).ok).toBe(true)
  })
  test('rejects missing, empty, unsupported and oversized files', async () => {
    expect(await store.submit('a1', undefined, 'charlie')).toMatchObject({ ok: false, status: 400 })
    expect(await store.submit('a1', new File([], 'empty.pdf'), 'charlie')).toMatchObject({ ok: false, status: 400 })
    expect(await store.submit('a1', new File(['demo'], 'demo.exe'), 'charlie')).toMatchObject({ ok: false, status: 415 })
    expect(await store.submit('a1', new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.txt'), 'charlie')).toMatchObject({ ok: false, status: 413 })
  })
  test('limits attempts per student, not globally or per upload demo cap', async () => {
    const file = new File(['demo'], 'demo.txt')
    for (let i = 0; i < 3; i++) expect((await store.submit('a1', file, 'limited')).ok).toBe(true)
    expect(await store.submit('a1', file, 'limited')).toMatchObject({ ok: false, status: 409 })
    expect((await store.submit('a1', file, 'another-student')).ok).toBe(true)
  })
})
