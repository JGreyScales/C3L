import { describe, expect, test } from 'bun:test'
import { createSubmissionStore, MAX_FILE_BYTES } from './submissions'

describe('submission storage and validation', () => {
  test('stores the original file with an assignment-specific receipt and timestamp', async () => {
    const store = createSubmissionStore()
    const result = store.submit('a1', new File(['demo'], 'demo.txt'))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    const { id, file, submittedAt } = result.submission
    expect(await file.text()).toBe('demo')
    expect(Number.isFinite(Date.parse(submittedAt))).toBe(true)
    expect(store.find('a1', id)).toEqual(result.submission)
    expect(store.find('a2', id)).toBeUndefined()
  })

  test('accepts a PDF at the size limit', () => {
    const file = new File([new Uint8Array(MAX_FILE_BYTES)], 'demo.PDF')
    expect(createSubmissionStore().submit('a1', file).ok).toBe(true)
  })

  test('rejects missing, empty, unsupported, and oversized files', () => {
    const store = createSubmissionStore()
    expect(store.submit('a1')).toMatchObject({ ok: false, status: 400 })
    expect(store.submit('a1', new File([], 'empty.pdf'))).toMatchObject({ ok: false, status: 400 })
    expect(store.submit('a1', new File(['demo'], 'demo.exe'))).toMatchObject({ ok: false, status: 415 })
    const oversized = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.txt')
    expect(store.submit('a1', oversized)).toMatchObject({ ok: false, status: 413 })
  })

  test('caps the prototype store', () => {
    const store = createSubmissionStore()
    const file = new File(['demo'], 'demo.txt')
    for (let index = 0; index < 20; index++) {
      expect(store.submit('a1', file).ok).toBe(true)
    }
    expect(store.submit('a1', file)).toMatchObject({ ok: false, status: 503 })
  })
})
