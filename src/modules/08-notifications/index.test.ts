import { expect, test } from 'bun:test'
import mod from './index'

const get = (path: string) => mod.router.handle(new Request(`http://localhost${path}`))

test('front page answers with HTML', async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('Notifications')
})

test('inbox page loads', async () => {
  const res = await get('/inbox')
  expect(res.status).toBe(200)
})

test('messages page loads', async () => {
  const res = await get('/messages')
  expect(res.status).toBe(200)
})
