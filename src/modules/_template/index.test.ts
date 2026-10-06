// A tiny unit test for this module. Run every test with:  bun run test
// When you copy the template this file comes with it. Change the checks to match your pages.
import { expect, test } from 'bun:test'
import mod from './index'

// A module's router can be tested on its own. Its addresses start at "/" (no folder name).
const get = (path: string) => mod.router.handle(new Request(`http://localhost${path}`))

test('the front page answers 200', async () => {
  const response = await get('/')
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('Hello from my module')
})

test('the second page answers 200', async () => {
  const response = await get('/second-page')
  expect(response.status).toBe(200)
})
