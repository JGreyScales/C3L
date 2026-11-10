import { expect, test } from 'bun:test'
import { createApp } from '../../app'
import type { LearningModule } from './module.model'

test('mounted Module 3 homepage links to the management page', async () => {
  const app = await createApp()
  const home = await app.fetch(new Request('http://localhost/03-content/'))
  expect(home.status).toBe(200)
  expect(home.headers.get('content-type')).toContain('text/html')
  expect(await home.text()).toContain('href="/03-content/manage"')

  const management = await app.fetch(new Request('http://localhost/03-content/manage?courseId=DEMO-101'))
  expect(management.status).toBe(200)
  expect(management.headers.get('content-type')).toContain('text/html')
  const html = await management.text()
  expect(html).toContain('Module 3 Content Management')
  expect(html).toContain('value="DEMO-101"')
  expect(html).toContain('id="create-form"')
})

test('mounted organization API filters shared Sprint-1 data and isolates courses', async () => {
  const app = await createApp()
  const courseId = `sprint2-${crypto.randomUUID()}`
  const otherCourseId = `sprint2-other-${crypto.randomUUID()}`
  const url = (id: string) => `http://localhost/03-content/api/courses/${encodeURIComponent(id)}/modules`
  const post = async (id: string, title: string, week: number, topic: string) => {
    const response = await app.fetch(new Request(url(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, week, topic }),
    }))
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toContain('application/json')
    return ((await response.json()) as { module: LearningModule }).module
  }
  const match = await post(courseId, 'Both filters', 2, 'Basics')
  const differentWeek = await post(courseId, 'Different week', 1, 'Basics')
  const differentTopic = await post(courseId, 'Different topic', 2, 'Advanced')
  const other = await post(otherCourseId, 'Other course', 2, 'Basics')

  const listed = await app.fetch(new Request(url(courseId)))
  expect(listed.status).toBe(200)
  expect(await listed.json()).toEqual({ modules: [match, differentWeek, differentTopic] })

  const query = new URLSearchParams({ week: '2', topic: ' bAsIcS ' })
  const organized = await app.fetch(new Request(`${url(courseId)}/organized?${query}`))
  expect(organized.status).toBe(200)
  expect(organized.headers.get('content-type')).toContain('application/json')
  expect(await organized.json()).toEqual({ modules: [match] })

  const otherOrganized = await app.fetch(new Request(`${url(otherCourseId)}/organized?${query}`))
  expect(otherOrganized.status).toBe(200)
  expect(await otherOrganized.json()).toEqual({ modules: [other] })

  const invalid = await app.fetch(new Request(`${url(courseId)}/organized?week=2abc`))
  expect(invalid.status).toBe(400)
  expect(invalid.headers.get('content-type')).toContain('application/json')
  expect(await invalid.json()).toEqual({ error: 'Week must be a positive safe integer' })
})

test('mounted Module 3 supports create then list with course isolation', async () => {
  const app = await createApp()
  const courseId = `DEMO-101-${crypto.randomUUID()}`
  const otherCourseId = `DEMO-OTHER-${crypto.randomUUID()}`
  const url = (id: string) => `http://localhost/03-content/api/courses/${id}/modules`
  const post = (id: string, title: string) =>
    app.fetch(new Request(url(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    }))

  const createdResponse = await post(courseId, 'Sprint-1 demonstration')
  expect(createdResponse.status).toBe(201)
  expect(createdResponse.headers.get('content-type')).toContain('application/json')
  const created = (await createdResponse.json()) as { module: LearningModule }
  expect(created.module).toMatchObject({ courseId, title: 'Sprint-1 demonstration' })
  expect(created.module.id).toBeTruthy()

  const otherResponse = await post(otherCourseId, 'Other course')
  expect(otherResponse.status).toBe(201)
  const other = (await otherResponse.json()) as { module: LearningModule }

  const listedResponse = await app.fetch(new Request(url(courseId)))
  expect(listedResponse.status).toBe(200)
  expect(listedResponse.headers.get('content-type')).toContain('application/json')
  expect(await listedResponse.json()).toEqual({ modules: [created.module] })

  const otherList = await app.fetch(new Request(url(otherCourseId)))
  expect(otherList.status).toBe(200)
  expect(await otherList.json()).toEqual({ modules: [other.module] })

  const invalidResponse = await post(courseId, '   ')
  expect(invalidResponse.status).toBe(400)
  expect(invalidResponse.headers.get('content-type')).toContain('application/json')
  expect(await invalidResponse.json()).toEqual({ error: 'Module title is required' })
  const afterInvalid = await app.fetch(new Request(url(courseId)))
  expect(await afterInvalid.json()).toEqual({ modules: [created.module] })

  for (const [path, text] of [
    ['/03-content', 'Module 3: Content Management'],
    ['/03-content/hello', 'Hello from Module 3'],
  ]) {
    const response = await app.fetch(new Request(`http://localhost${path}`))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain(text)
  }
})
