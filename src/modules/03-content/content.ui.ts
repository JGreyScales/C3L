import { Elysia } from 'elysia'
import { escapeHtml } from '../../core/pages'

function managementPage(courseId: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Module 3 Content Management | C3L</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f6fa; color: #182b45; font: 16px/1.6 system-ui, sans-serif; }
    main { max-width: 1120px; margin: auto; padding: 32px 20px 64px; }
    nav, .actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    a { color: #174db5; } h1 { line-height: 1.2; margin-bottom: 12px; }
    h2 { margin-top: 0; } .lead, .hint { color: #52647c; }
    .layout { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr); gap: 24px; align-items: start; }
    .panel { background: white; border: 1px solid #d8e1ee; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .layout .panel { margin: 0; } label { display: block; font-weight: 600; margin-bottom: 16px; }
    input, textarea, button { font: inherit; border-radius: 6px; }
    input, textarea { display: block; width: 100%; padding: 9px 12px; border: 1px solid #8798af; margin-top: 4px; color: inherit; background: white; }
    textarea { resize: vertical; } button { padding: 10px 16px; border: 1px solid #174db5; background: #174db5; color: white; cursor: pointer; }
    button.secondary { background: white; color: #174db5; } button:disabled { opacity: .6; cursor: wait; }
    :focus-visible { outline: 3px solid #e5a328; outline-offset: 3px; }
    .filters { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .filters .actions { grid-column: 1 / -1; } #modules { list-style: none; padding: 0; }
    #modules li { border-top: 1px solid #d8e1ee; padding: 16px 0; overflow-wrap: anywhere; }
    #modules h3 { margin: 0 0 8px; } #modules p { margin: 6px 0; white-space: pre-wrap; }
    .feedback { min-height: 1.6em; overflow-wrap: anywhere; } .feedback[data-kind="error"] { color: #a51b26; }
    .feedback[data-kind="success"] { color: #17643b; }
    @media (max-width: 720px) { .layout, .filters { grid-template-columns: 1fr; } main { padding: 24px 14px; } .panel { padding: 18px; } }
  </style>
</head>
<body><main>
  <nav aria-label="Main navigation"><a href="/03-content">Module 3 home</a><a href="/">C3L homepage</a></nav>
  <header><h1>Module 3 Content Management</h1><p class="lead">Create learning modules and organize your course by week or topic.</p></header>
  <section class="panel" aria-labelledby="course-heading">
    <h2 id="course-heading">Select a course</h2>
    <form id="course-form">
      <label for="course-id">Course ID<input id="course-id" name="courseId" required value="${escapeHtml(courseId)}" placeholder="DEMO-101"></label>
      <button type="submit">Load Modules</button>
    </form>
    <p class="hint">Enter a course ID to manage its modules. Prototype data is lost when the server restarts.</p>
  </section>
  <div class="layout">
    <section class="panel" aria-labelledby="create-heading">
      <h2 id="create-heading">Create a module</h2>
      <form id="create-form">
        <label for="module-title">Title (required)<input id="module-title" name="title" required></label>
        <label for="module-description">Description (optional)<textarea id="module-description" name="description" rows="4"></textarea></label>
        <label for="module-week">Week (optional)<input id="module-week" name="week" type="number" min="1" step="1"></label>
        <label for="module-topic">Topic (optional)<input id="module-topic" name="topic"></label>
        <button id="create-button" type="submit">Create Module</button>
      </form>
      <p id="create-status" class="feedback" role="status" aria-live="polite"></p>
    </section>
    <section class="panel" aria-labelledby="list-heading">
      <h2 id="list-heading">Learning modules</h2>
      <p id="selected-course" class="hint">Choose a course to begin.</p>
      <form id="filter-form" class="filters">
        <label for="filter-week">Filter by week<input id="filter-week" name="week" type="number" min="1" step="1"></label>
        <label for="filter-topic">Filter by topic<input id="filter-topic" name="topic" placeholder="Exact topic match"></label>
        <div class="actions"><button type="submit">Apply Filters</button><button id="clear-filters" class="secondary" type="button">Clear Filters</button></div>
      </form>
      <p id="list-status" class="feedback" role="status" aria-live="polite">Enter a course ID and select Load Modules.</p>
      <ul id="modules" aria-label="Course learning modules"></ul>
    </section>
  </div>
</main>
<script>
(() => {
  const byId = (id) => document.getElementById(id);
  const courseInput = byId('course-id');
  const list = byId('modules');
  let listRequest = 0;
  let creating = false;

  function feedback(id, message, kind = '') {
    const element = byId(id);
    element.textContent = message;
    element.dataset.kind = kind;
  }
  function courseId() {
    const value = courseInput.value.trim();
    if (!value) throw new Error('Enter a course ID.');
    return value;
  }
  function weekValue(id) {
    const input = byId(id);
    const raw = input.value;
    if (input.validity.badInput) throw new Error('Week must be a positive safe integer.');
    if (raw === '') return undefined;
    const value = Number(raw);
    if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1) {
      throw new Error('Week must be a positive safe integer.');
    }
    return value;
  }
  function apiUrl(id) {
    return '/03-content/api/courses/' + encodeURIComponent(id) + '/modules';
  }
  async function requestJson(url, options) {
    const response = await fetch(url, options);
    let data;
    try { data = await response.json(); }
    catch { throw new Error('The server returned an unreadable response. Please try again.'); }
    if (!response.ok) {
      throw new Error(data && typeof data.error === 'string' ? data.error : 'Request failed (' + response.status + ').');
    }
    return data;
  }
  function errorText(error) {
    return error instanceof Error ? error.message : 'Request failed. Please try again.';
  }
  function renderModules(modules) {
    list.replaceChildren();
    for (const module of modules) {
      const item = document.createElement('li');
      const title = document.createElement('h3');
      title.textContent = module.title;
      item.append(title);
      if (module.description) {
        const description = document.createElement('p');
        description.textContent = module.description;
        item.append(description);
      }
      const details = document.createElement('p');
      details.textContent = 'Week: ' + (module.week ?? 'Unnumbered') + ' • Topic: ' + (module.topic || 'No topic');
      const created = document.createElement('p');
      const date = new Date(module.createdAt);
      created.textContent = 'Created: ' + (Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString());
      item.append(details, created);
      list.append(item);
    }
  }
  async function loadModules() {
    const currentRequest = ++listRequest;
    list.replaceChildren();
    byId('selected-course').textContent = 'Choose a course to begin.';
    try {
      const id = courseId();
      const week = weekValue('filter-week');
      const topic = byId('filter-topic').value.trim();
      const query = new URLSearchParams();
      if (week !== undefined) query.set('week', String(week));
      if (topic) query.set('topic', topic);
      byId('selected-course').textContent = 'Course: ' + id;
      feedback('list-status', 'Loading modules…');
      const data = await requestJson(apiUrl(id) + '/organized?' + query.toString());
      if (currentRequest !== listRequest) return;
      if (!data || !Array.isArray(data.modules)) throw new Error('The server returned an invalid module list.');
      renderModules(data.modules);
      feedback('list-status', data.modules.length ? data.modules.length + ' module(s) loaded.' : 'No modules match this course and filters.');
    } catch (error) {
      if (currentRequest === listRequest) {
        list.replaceChildren();
        feedback('list-status', errorText(error), 'error');
      }
    }
  }
  byId('course-form').addEventListener('submit', (event) => {
    event.preventDefault();
    feedback('create-status', '');
    void loadModules();
  });
  byId('filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void loadModules();
  });
  byId('clear-filters').addEventListener('click', () => {
    byId('filter-form').reset();
    void loadModules();
  });
  courseInput.addEventListener('input', () => {
    ++listRequest;
    list.replaceChildren();
    byId('selected-course').textContent = 'Choose a course to begin.';
    feedback('list-status', 'Select Load Modules to view this course.');
    feedback('create-status', '');
  });
  byId('create-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (creating) return;
    try {
      const id = courseId();
      const title = byId('module-title').value.trim();
      if (!title) throw new Error('Enter a module title.');
      const week = weekValue('module-week');
      const body = { title };
      const description = byId('module-description').value.trim();
      const topic = byId('module-topic').value.trim();
      if (description) body.description = description;
      if (topic) body.topic = topic;
      if (week !== undefined) body.week = week;
      creating = true;
      byId('create-button').disabled = true;
      feedback('create-status', 'Creating module…');
      await requestJson(apiUrl(id), {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      byId('create-form').reset();
      feedback('create-status', 'Module created successfully for ' + id + '.', 'success');
      // Refresh the current course; active filters may hide the new module.
      await loadModules();
    } catch (error) {
      feedback('create-status', errorText(error), 'error');
    } finally {
      creating = false;
      byId('create-button').disabled = false;
    }
  });
  if (courseInput.value.trim()) void loadModules();
})();
</script>
</body></html>`
}

export const contentUiRoutes = new Elysia().get('/manage', ({ request, set }) => {
  const courseId = new URL(request.url).searchParams.get('courseId') ?? ''
  set.headers['content-type'] = 'text/html; charset=utf-8'
  return managementPage(courseId)
})
