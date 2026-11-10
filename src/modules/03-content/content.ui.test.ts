import { describe, expect, test } from 'bun:test'
import { escapeHtml } from '../../core/pages'
import { contentUiRoutes } from './content.ui'

const page = (courseId?: string) => {
  const query = new URLSearchParams()
  if (courseId !== undefined) query.set('courseId', courseId)
  return contentUiRoutes.handle(new Request(`http://localhost/manage?${query}`))
}

describe('Content management page HTML', () => {
  test('GET /manage returns HTTP 200 and HTML', async () => {
    const response = await page()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await response.text()).toContain('<!doctype html>')
  })

  test('renders heading and module/homepage navigation', async () => {
    const html = await (await page()).text()
    expect(html).toContain('<h1>Module 3 Content Management</h1>')
    expect(html).toContain('href="/03-content"')
    expect(html).toContain('href="/"')
  })

  test('prefills an editable course input from the query', async () => {
    const html = await (await page('DEMO-101')).text()
    expect(html).toContain('name="courseId" required value="DEMO-101"')
    expect(html).toContain('Load Modules')
    expect(html).toContain('if (courseInput.value.trim()) void loadModules()')
  })

  test('provides required title and optional description, week and topic fields', async () => {
    const html = await (await page()).text()
    expect(html).toContain('id="create-form"')
    expect(html).toContain('id="module-title" name="title" required')
    expect(html).toContain('id="module-description" name="description"')
    expect(html).toContain('id="module-week" name="week" type="number" min="1" step="1"')
    expect(html).toContain('id="module-topic" name="topic"')
  })

  test('includes course controls, filters and clear action', async () => {
    const html = await (await page()).text()
    for (const id of ['course-form', 'course-id', 'filter-form', 'filter-week', 'filter-topic', 'clear-filters']) {
      expect(html).toContain(`id="${id}"`)
    }
    expect(html).toContain('Clear Filters')
  })

  test('references existing POST and organized GET APIs with safe URL construction', async () => {
    const html = await (await page()).text()
    expect(html).toContain("'/03-content/api/courses/' + encodeURIComponent(id) + '/modules'")
    expect(html).toContain("method: 'POST'")
    expect(html).toContain("'content-type': 'application/json'")
    expect(html).toContain('body: JSON.stringify(body)')
    expect(html).toContain("apiUrl(id) + '/organized?'")
    expect(html).toContain('new URLSearchParams()')
    expect(html).toContain('Number.isSafeInteger(value)')
    expect(html).toContain('if (week !== undefined) body.week = week')
  })

  test.each([
    '\"><script>alert(1)</script><input value="',
    "' autofocus onfocus='alert(1)",
    '</script><img src=x onerror=alert(1)>',
    'COURSE&<topic>"\'',
  ])('escapes malicious query value %j without placing it in scripts', async (courseId) => {
    const html = await (await page(courseId)).text()
    expect(html).toContain(`value="${escapeHtml(courseId)}"`)
    expect(html).not.toContain(courseId)
    const script = html.split('<script>')[1]?.split('</script>')[0]
    const baseline = (await (await page()).text()).split('<script>')[1]?.split('</script>')[0]
    expect(script).toBe(baseline)
    expect(html.match(/<script>/g)).toHaveLength(1)
    expect(html).not.toContain('innerHTML')
  })

  test.each([undefined, '', '   '])('supports empty course ID %j with a usable page', async (courseId) => {
    const response = await page(courseId)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('Enter a course ID and select Load Modules.')
    expect(html).toContain('id="course-id"')
    expect(html).toContain('id="create-form"')
  })

  test('includes responsive styles and accessible feedback', async () => {
    const html = await (await page()).text()
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1"')
    expect(html).toContain('@media (max-width: 720px)')
    expect(html).toContain('grid-template-columns: 1fr')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('Loading modules…')
    expect(html).toContain('No modules match this course and filters.')
    expect(html).toContain('Module created successfully')
    expect(html).toContain('title.textContent = module.title')
    expect(html).toContain('description.textContent = module.description')
  })
})
