import { describe, expect, test } from 'bun:test'
import type { CreateLearningModuleInput } from './module.model'
import { listOrganizedModules, moduleOrganizeRoutes } from './module.organize.routes'
import { createLearningModule, getLearningModulesByCourse } from './module.service'

const uniqueCourseId = () => `organize-test-${crypto.randomUUID()}`
const create = (courseId: string, title: string, fields: Partial<CreateLearningModuleInput> = {}) =>
  createLearningModule({ ...fields, courseId, title })

const organize = (courseId: string, query: Record<string, string> = {}) =>
  moduleOrganizeRoutes.handle(new Request(
    `http://localhost/api/courses/${encodeURIComponent(courseId)}/modules/organized?${new URLSearchParams(query)}`,
  ))
const jsonModules = (modules: ReturnType<typeof getLearningModulesByCourse>) =>
  ({ modules: JSON.parse(JSON.stringify(modules)) })

describe('Learning-module organization HTTP API', () => {
  test('returns 200 JSON with sorted modules and preserves stored records', async () => {
    const courseId = uniqueCourseId()
    const missing = create(courseId, 'Missing')
    const later = create(courseId, 'Later', { week: 2, topic: 'BASICS' })
    const first = create(courseId, 'First', { week: 1, topic: 'Basics' })
    const tied = create(courseId, 'Tied', { week: 2 })
    const before = getLearningModulesByCourse(courseId).map((module) => ({ ...module }))
    for (const module of getLearningModulesByCourse(courseId)) Object.freeze(module)

    const response = await organize(` ${courseId} `)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual(jsonModules([first, later, tied, missing]))
    await organize(courseId, { topic: ' basics ', week: '2' })
    expect(getLearningModulesByCourse(courseId)).toEqual(before)
  })

  test('filters by week and excludes other courses', async () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Match', { week: 2 })
    create(courseId, 'Different week', { week: 1 })
    create(uniqueCourseId(), 'Other course', { week: 2 })
    const response = await organize(courseId, { week: '2' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(jsonModules([match]))
  })

  test('matches trimmed topics case-insensitively and exactly', async () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Match', { topic: 'Basics' })
    create(courseId, 'Longer topic', { topic: 'Basics advanced' })
    create(courseId, 'Missing topic')
    const response = await organize(courseId, { topic: ' bAsIcS ' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(jsonModules([match]))
  })

  test('combines filters using AND', async () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Both', { week: 2, topic: 'Basics' })
    create(courseId, 'Week only', { week: 2, topic: 'Other' })
    create(courseId, 'Topic only', { week: 1, topic: 'Basics' })
    const response = await organize(courseId, { week: '2', topic: ' BASICS ' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(jsonModules([match]))
  })

  test('returns empty JSON modules for unknown courses and unmatched filters', async () => {
    const courseId = uniqueCourseId()
    const empty = await organize(courseId)
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({ modules: [] })
    create(courseId, 'Existing', { week: 1 })
    const unmatched = await organize(courseId, { week: '2' })
    expect(unmatched.status).toBe(200)
    expect(await unmatched.json()).toEqual({ modules: [] })
  })

  test.each([
    '0', '-1', '1.5', 'abc', '', '2abc', ' ', ' 2 ', '1e2', '0x10',
    '+2', 'NaN', 'Infinity', '9007199254740992', '9007199254740993',
  ])('rejects invalid week query %j with JSON 400', async (week) => {
    const response = await organize(uniqueCourseId(), { week })
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'Week must be a positive safe integer' })
  })

  test('accepts the maximum safe integer week', async () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Safe limit', { week: Number.MAX_SAFE_INTEGER })
    const response = await organize(courseId, { week: String(Number.MAX_SAFE_INTEGER) })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(jsonModules([match]))
  })

  test.each([' ', '\t\n'])('rejects matched blank course ID %j with JSON 400', async (courseId) => {
    const response = await organize(courseId)
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ error: 'Course ID is required' })
  })

  test('treats blank topic as no filter', async () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'No topic')
    const response = await organize(courseId, { topic: '   ' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(jsonModules([match]))
  })
})

describe('Learning-module organization', () => {
  test('filters by week', () => {
    const courseId = uniqueCourseId()
    create(courseId, 'Week one', { week: 1 })
    const match = create(courseId, 'Week two', { week: 2 })
    create(courseId, 'Unnumbered')
    expect(listOrganizedModules(courseId, { week: 2 })).toEqual([match])
  })

  test('trims topic and matches case-insensitively and exactly', () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Match', { topic: ' TypeScript ' })
    create(courseId, 'Longer topic', { topic: 'TypeScript Basics' })
    create(courseId, 'No topic')
    expect(listOrganizedModules(courseId, { topic: ' tYpEsCrIpT ' })).toEqual([match])
  })

  test('combines week and topic with AND', () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Both', { week: 2, topic: 'Basics' })
    create(courseId, 'Week only', { week: 2, topic: 'Advanced' })
    create(courseId, 'Topic only', { week: 1, topic: 'Basics' })
    expect(listOrganizedModules(courseId, { week: 2, topic: ' basics ' })).toEqual([match])
  })

  test('returns empty results for unknown courses and unmatched filters', () => {
    const courseId = uniqueCourseId()
    expect(listOrganizedModules(courseId, {})).toEqual([])
    create(courseId, 'Existing', { week: 1, topic: 'Basics' })
    expect(listOrganizedModules(courseId, { week: 9 })).toEqual([])
    expect(listOrganizedModules(courseId, { topic: 'Missing' })).toEqual([])
  })

  test('trims course ID and isolates courses before filtering', () => {
    const courseId = uniqueCourseId()
    const match = create(courseId, 'Own', { week: 1, topic: 'Basics' })
    create(uniqueCourseId(), 'Other', { week: 1, topic: 'Basics' })
    expect(listOrganizedModules(` ${courseId} `, { week: 1, topic: 'Basics' })).toEqual([match])
  })

  test.each(['', ' ', '\t\n'])('rejects blank course ID %j', (courseId) => {
    expect(() => listOrganizedModules(courseId, {})).toThrow('Course ID is required')
  })

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid numeric week %s', (week) => {
      expect(() => listOrganizedModules(uniqueCourseId(), { week }))
        .toThrow('Week must be a positive integer')
    },
  )

  test.each(['2', null, true])('rejects invalid runtime week %j', (week) => {
    expect(() => listOrganizedModules(uniqueCourseId(), { week: week as unknown as number }))
      .toThrow('Week must be a positive integer')
  })

  test('sorts ascending with missing weeks last and stable order for ties', () => {
    const courseId = uniqueCourseId()
    const missingFirst = create(courseId, 'Missing first')
    const twoFirst = create(courseId, 'Two first', { week: 2 })
    const one = create(courseId, 'One', { week: 1 })
    const twoSecond = create(courseId, 'Two second', { week: 2 })
    const missingSecond = create(courseId, 'Missing second')
    expect(listOrganizedModules(courseId, {})).toEqual([
      one, twoFirst, twoSecond, missingFirst, missingSecond,
    ])
  })

  test('treats blank topic as no filter', () => {
    const courseId = uniqueCourseId()
    const module = create(courseId, 'No topic')
    expect(listOrganizedModules(courseId, { topic: '   ' })).toEqual([module])
  })

  test('rejects a non-string runtime topic', () => {
    expect(() => listOrganizedModules(uniqueCourseId(), { topic: 42 as unknown as string }))
      .toThrow('Topic must be a string')
  })

  test('does not mutate stored objects or insertion order and returns independent objects', () => {
    const courseId = uniqueCourseId()
    const later = create(courseId, 'Later', { week: 2, topic: 'BASICS' })
    const earlier = create(courseId, 'Earlier', { week: 1, topic: 'Basics' })
    const before = getLearningModulesByCourse(courseId).map((module) => ({ ...module }))
    Object.freeze(later)
    Object.freeze(earlier)

    const result = listOrganizedModules(courseId, { topic: ' basics ' })
    expect(result).toEqual([earlier, later])
    expect(result[0]).not.toBe(earlier)
    expect(getLearningModulesByCourse(courseId)).toEqual(before)

    const first = result[0]
    if (!first) throw new Error('Expected an organized module')
    first.title = 'Changed result'
    first.week = 99
    result.reverse()
    result.pop()
    expect(getLearningModulesByCourse(courseId)).toEqual(before)
  })
})
