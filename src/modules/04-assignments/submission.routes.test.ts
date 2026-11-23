import { describe, expect, test } from 'bun:test'
import { createApp } from '../../app'

const app = await createApp()
const origin = 'http://localhost'
const details = '/04-assignments/assignments/assignment-001'
const submissions = `${details}/submissions`

function upload(path: string, ...files: File[]) {
  const body = new FormData()
  for (const file of files) body.append('file', file)
  return app.fetch(new Request(origin + path, { method: 'POST', body }))
}

describe('Module 4 submission workflow', () => {
  test('opens the multipart upload form from assignment details', async () => {
    const assignment = await app.fetch(new Request(origin + details))
    expect(await assignment.text()).toContain(`href="${submissions}"`)
    const form = await app.fetch(new Request(origin + submissions))
    expect(form.status).toBe(200)
    expect(await form.text()).toContain('enctype="multipart/form-data"')
  })

  test('redirects a successful upload to a receipt and returns the original bytes', async () => {
    const response = await upload(submissions, new File(['working demo'], 'hello.txt'))
    expect(response.status).toBe(303)
    const receiptPath = response.headers.get('location')
    expect(receiptPath).toStartWith(`${submissions}/`)
    const receipt = await app.fetch(new Request(origin + receiptPath))
    expect(receipt.status).toBe(200)
    const html = await receipt.text()
    expect(html).toContain('Submission received')
    expect(html).toContain('hello.txt')
    expect(html).toContain('Received at')
    const download = await app.fetch(new Request(`${origin}${receiptPath}/file`))
    expect(download.headers.get('content-disposition')).toStartWith('attachment')
    expect(await download.text()).toBe('working demo')

    const otherPath = receiptPath?.replace('assignment-001', 'assignment-002')
    const otherAssignment = await app.fetch(new Request(origin + otherPath))
    expect(otherAssignment.status).toBe(404)
  })

  test('rejects invalid uploads without creating a receipt', async () => {
    const file = new File(['demo'], 'demo.txt')
    const responses = await Promise.all([
      upload(submissions),
      upload(submissions, file, file),
      upload(submissions, new File(['demo'], 'demo.exe')),
      upload('/04-assignments/assignments/missing/submissions', file),
    ])
    expect(responses.map((response) => response.status)).toEqual([400, 400, 415, 404])
    expect(responses.every((response) => !response.headers.has('location'))).toBe(true)
    expect(await responses[2]?.text()).toContain('Choose a PDF or TXT file.')
  })
})
