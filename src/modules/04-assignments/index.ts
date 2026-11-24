// MODULE 4: Assignment & Submission System (Sprint 3)
// Owns assignment creation, persisted deadlines, submissions, attempts,
// history, late status and accommodations. Edits remain in this folder.
import { Elysia, t } from 'elysia'
import type { Database } from 'bun:sqlite'
import { resolve, sep } from 'node:path'
import { defineModule, moduleBase } from '../../core/defineModule'
import { escapeHtml } from '../../core/pages'
import {
  createAssignment,
  type AssignmentInput,
  type AssignmentFieldErrors,
} from './createAssignment'
import {
  formatDueDate,
  parseDueDateInput,
  setAssignmentDueDate,
  toDateTimeLocalValue,
} from './dueDate'
import { assignmentPage } from './layout'
import { db } from './db/database'
import {
  deleteAccommodation,
  getAssignment,
  getAccommodation,
  listAccommodations,
  listAssignments,
  saveAccommodation,
  type AssignmentRecord,
  type SubmissionRecord,
} from './db/repository'
import { DEFAULT_UPLOADS_DIR } from './db/uploads'
import { updateAssignmentDueDate } from './assignments'
import { createSubmissionStore, MAX_FILE_BYTES } from './submissions'
import { effectiveDueDate } from './lateness'
import {
  canManage,
  canSubmit,
  canViewHistory,
  currentActor,
  findCourse,
  type Actor,
  type CourseInfo,
} from './integration'

const base = moduleBase(import.meta.dir)
const html = (status: number, body: string): Response =>
  new Response(
    body.trimStart().startsWith('<!doctype html>')
      ? body
      : assignmentPage(status === 403 ? 'Access denied' : 'Module 4', body),
    {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    },
  )
const forbidden = (message = 'You do not have permission to do this.') =>
  html(403, `<h1>Access denied</h1><p>${escapeHtml(message)}</p>`)
const unauthorized = () =>
  html(
    401,
    '<h1>Sign in required</h1><p><a href="/01-identity-users">Sign in through Module 1</a>, then return here.</p>',
  )
const missing = (kind: string) =>
  html(404, `<h1>${escapeHtml(kind)} not found</h1><p><a href="${base}">Back to Module 4</a></p>`)
const submissionPath = (assignmentId: string) =>
  `${base}/assignments/${encodeURIComponent(assignmentId)}/submissions`
const detailsPath = (assignmentId: string) =>
  `${base}/assignments/${encodeURIComponent(assignmentId)}`

export interface RouterOptions {
  database?: Database
  uploadDirectory?: string
  getActor?: (request: Request) => Promise<Actor | null>
  getCourse?: (courseId: string) => Promise<CourseInfo | null>
}

/** Factory permits isolated, authenticated integration tests without a running server. */
export function createAssignmentsRouter(options: RouterOptions = {}) {
  const database = options.database ?? db
  const uploadDirectory = options.uploadDirectory ?? DEFAULT_UPLOADS_DIR
  const resolveActor = options.getActor ?? currentActor
  const resolveCourse = options.getCourse ?? findCourse
  const store = createSubmissionStore(database, uploadDirectory)
  const assignment = (id: string) => getAssignment(database, id)

  async function gate(request: Request, courseId: string) {
    const actor = await resolveActor(request)
    if (!actor) return { error: unauthorized() }
    const course = await resolveCourse(courseId)
    if (!course) return { error: missing('Course') }
    return { actor, course }
  }

  function renderAssignmentList(courseId: string): string {
    const records = listAssignments(database, courseId)
    const items = records
      .map(
        (item) => `
      <li><a href="${detailsPath(item.id)}"><strong>${escapeHtml(item.title)}</strong></a>
      <span> — Due: ${escapeHtml(formatDueDate(item.dueAt))}</span></li>`,
      )
      .join('')
    return assignmentPage(
      'Assignments',
      `
      <h1>Assignments</h1><p class="facts">Course: <strong>${escapeHtml(courseId)}</strong></p>
      ${records.length ? `<ul class="assignment-list">${items}</ul>` : '<p>No assignments found for this course.</p>'}
      <p><a href="${base}/assignments/new?courseId=${encodeURIComponent(courseId)}">Create assignment</a></p>
      <p><a href="${base}">Back to Module 4</a></p>`,
    )
  }

  function renderAssignmentDetails(item: AssignmentRecord, canEdit: boolean): string {
    return assignmentPage(
      item.title,
      `
      <h1>${escapeHtml(item.title)}</h1>
      <p><strong>Course:</strong> ${escapeHtml(item.courseId)}</p>
      <p><strong>Description:</strong> ${escapeHtml(item.description)}</p>
      <p class="facts"><strong>Due date:</strong> ${escapeHtml(formatDueDate(item.dueAt))}<br>
      <strong>Maximum attempts:</strong> ${item.maxAttempts}</p>
      <div class="actions"><a class="button" href="${submissionPath(item.id)}">Submit assignment file</a>
      <a class="button" href="${submissionPath(item.id)}/history">Submission history</a></div>
      ${
        canEdit
          ? `<p><a href="${detailsPath(item.id)}/due-date">Change due date</a></p>
      <p><a href="${detailsPath(item.id)}/accommodations">Grant accommodation</a></p>`
          : ''
      }
      <p><a href="${base}/assignments?courseId=${encodeURIComponent(item.courseId)}">Back to assignments</a></p>`,
    )
  }

  function renderCreateAssignmentForm(
    input: AssignmentInput,
    errors: AssignmentFieldErrors = {},
  ): string {
    const value = (key: keyof AssignmentInput) => escapeHtml(input[key] ?? '')
    const error = (key: keyof AssignmentFieldErrors) =>
      errors[key]
        ? `<p role="alert"><strong>Error:</strong> ${escapeHtml(errors[key] ?? '')}</p>`
        : ''
    return assignmentPage(
      'Create assignment',
      `
      <h1>Create Assignment</h1><p class="facts">Course: <strong>${value('courseId')}</strong></p>
      <form method="post" action="${base}/assignments/new">
      <input type="hidden" name="courseId" value="${value('courseId')}">
      <label for="title">Assignment title</label><input id="title" name="title" maxlength="200" value="${value('title')}">${error('title')}
      <label for="description">Description</label><textarea id="description" name="description" maxlength="5000" rows="5">${value('description')}</textarea>${error('description')}
      <label for="dueDate">Due date and time (Toronto time)</label><input type="datetime-local" id="dueDate" name="dueDate" value="${value('dueDate')}">${error('dueDate')}
      <label for="maxAttempts">Maximum submission attempts</label><input type="number" id="maxAttempts" name="maxAttempts" min="1" max="50" value="${value('maxAttempts') || '3'}">${error('maxAttempts')}
      ${error('courseId')}<button type="submit">Create assignment</button></form>
      <p><a href="${base}/assignments?courseId=${encodeURIComponent(input.courseId ?? '')}">Back to assignments</a></p>`,
    )
  }

  function renderDueDateForm(item: AssignmentRecord, value: string, error?: string): string {
    return assignmentPage(
      'Change due date',
      `
      <h1>Due date: ${escapeHtml(item.title)}</h1>
      ${error ? `<p role="alert"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
      <form method="post" action="${detailsPath(item.id)}/due-date">
      <label for="dueDate">Due date and time (Toronto time)</label>
      <input type="datetime-local" id="dueDate" name="dueDate" value="${escapeHtml(value)}">
      <button type="submit">Save due date</button></form>
      <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
    )
  }

  function renderSubmissionForm(
    item: AssignmentRecord,
    effectiveDueAt: string = item.dueAt,
    error?: string,
  ): string {
    const extended = effectiveDueAt !== item.dueAt
    // The student sees their own effective deadline; the accommodation reason stays instructor-only.
    const deadlineFacts = extended
      ? `Your due date: <strong>${escapeHtml(formatDueDate(effectiveDueAt))}</strong><br>
      <span>Class due date: ${escapeHtml(formatDueDate(item.dueAt))} — you have an approved extension.</span><br>`
      : `Due: ${escapeHtml(formatDueDate(item.dueAt))}<br>`
    return assignmentPage(
      'Submit assignment',
      `
      <h1>Submit assignment file</h1>
      <div class="facts"><strong>${escapeHtml(item.title)}</strong><br>${deadlineFacts}Maximum attempts: ${item.maxAttempts}</div>
      <p>PDF or TXT, up to 5 MB. Your files and receipts remain saved after restarting the server.</p>
      ${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}
      <form method="post" enctype="multipart/form-data" action="${submissionPath(item.id)}">
      <label for="file">Assignment file (PDF or TXT, up to 5 MB)</label>
      <input type="file" id="file" name="file" accept=".pdf,.txt" required>
      <button type="submit">Submit file</button></form>
      <p><a href="${submissionPath(item.id)}/history">View submission history</a></p>
      <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
    )
  }

  function renderSubmissionReceipt(row: SubmissionRecord): string {
    const path = `${submissionPath(row.assignmentId)}/${encodeURIComponent(row.id)}`
    return assignmentPage(
      'Submission received',
      `
      <h1>Submission received</h1><p class="success">Submission saved permanently.</p>
      <dl class="facts"><dt>Receipt ID</dt><dd>${escapeHtml(row.id)}</dd>
      <dt>Attempt</dt><dd>${row.attemptNumber}</dd>
      <dt>File</dt><dd>${escapeHtml(row.fileName)}</dd>
      <dt>Received at</dt><dd><time datetime="${escapeHtml(row.submittedAt)}">${escapeHtml(row.submittedAt)} (UTC)</time></dd>
      <dt>Deadline</dt><dd>${escapeHtml(formatDueDate(row.effectiveDueAt))}</dd>
      <dt>Status</dt><dd>${escapeHtml(row.status)}</dd></dl>
      <p><a href="${path}">Open receipt</a></p>
      <div class="actions"><a class="button" href="${path}/file">Download submitted file</a></div>
      <p><a href="${submissionPath(row.assignmentId)}/history">Submission history</a></p>
      <p><a href="${detailsPath(row.assignmentId)}">Back to assignment</a></p>`,
    )
  }

  function historyFor(item: AssignmentRecord, rows: SubmissionRecord[], studentId: string): string {
    return assignmentPage(
      'Submission history',
      `
      <h1>Submission history</h1><p class="facts">Assignment: <strong>${escapeHtml(item.title)}</strong><br>
      Student ID: ${escapeHtml(studentId)}<br>${rows.length} of ${item.maxAttempts} attempts used</p>
      ${
        rows.length
          ? `<ol class="assignment-list">${rows
              .map(
                (row) => `<li>
        <a href="${submissionPath(item.id)}/${encodeURIComponent(row.id)}">Attempt ${row.attemptNumber}</a>
        <span>${escapeHtml(row.fileName)} — ${escapeHtml(row.status)}</span>
        <span>Submitted ${escapeHtml(row.submittedAt)} (UTC)</span>
        <span>Effective deadline: ${escapeHtml(formatDueDate(row.effectiveDueAt))}</span></li>`,
              )
              .join('')}</ol>`
          : '<p>No submissions yet.</p>'
      }
      <p><a href="${submissionPath(item.id)}">Submit a new attempt</a></p>
      <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
    )
  }

  function renderAccommodationsPage(item: AssignmentRecord): string {
    const rows = listAccommodations(database, item.id)
    const list = rows.length
      ? `<h2>Current accommodations</h2>
      <ul class="assignment-list">${rows
        .map(
          (row) => `<li>
        <span><strong>Student ${escapeHtml(row.studentId)}</strong> — extended to ${escapeHtml(formatDueDate(row.extendedDueAt))}</span>
        <span>Reason: ${escapeHtml(row.reason)}</span>
        <form method="post" action="${detailsPath(item.id)}/accommodations/remove">
        <input type="hidden" name="studentId" value="${escapeHtml(row.studentId)}">
        <button type="submit">Remove</button></form></li>`,
        )
        .join('')}</ul>`
      : '<p>No accommodations granted yet.</p>'
    return assignmentPage(
      'Grant accommodation',
      `
      <h1>Deadline accommodations</h1><p>${escapeHtml(item.title)}</p>
      <h2>Grant or change an accommodation</h2>
      <form method="post" action="${detailsPath(item.id)}/accommodations">
      <label for="studentId">Enrolled student's ID</label><input id="studentId" name="studentId" required>
      <label for="extendedDueAt">Extended due date (Toronto time)</label><input type="datetime-local" id="extendedDueAt" name="extendedDueAt" required>
      <label for="reason">Reason (only instructors see this)</label><textarea id="reason" name="reason" maxlength="500" required></textarea>
      <button type="submit">Grant extension</button></form>
      ${list}
      <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
    )
  }

  async function authorizeSubmission(
    request: Request,
    item: AssignmentRecord,
    receipt?: SubmissionRecord,
  ) {
    const result = await gate(request, item.courseId)
    if ('error' in result) return { error: result.error }
    const { actor, course } = result
    // Previously enrolled students may still retrieve their own already-saved work after
    // Module 2's in-memory enrollment array resets on a server restart. This exception
    // NEVER permits a new upload: submit always requires current enrollment.
    const ownsSavedWork =
      actor?.role === 'student' &&
      (receipt ? receipt.studentId === actor.id : store.history(item.id, actor.id).length > 0)
    if (
      actor &&
      course &&
      (canViewHistory(actor) ||
        (actor.role === 'student' &&
          (!receipt || receipt.studentId === actor.id) &&
          (canSubmit(actor, course) || ownsSavedWork)))
    ) {
      return { actor, course }
    }
    return {
      error: forbidden(
        'Only the enrolled student, owner of a saved attempt, or instructor can access this submission.',
      ),
    }
  }

  return (
    new Elysia()
      .get('/', () =>
        assignmentPage(
          'Assignment & Submission System',
          `
      <h1>Module 4: Assignment &amp; Submission System</h1>
      <p>Create assignments, submit and resubmit work, and view permanent attempt history.</p>
      <p><a class="button" href="${base}/assignments?courseId=1">View Course 1 Assignments</a></p>
      <p><a href="/01-identity-users">Identity &amp; accounts</a> · <a href="/02-courses">Course management</a></p>
      <p><a href="/">Back to LMS home</a></p>`,
        ),
      )

      // Sprint 1: list, create, details, edit deadline.
      .get('/assignments', ({ query, set }) => {
        const courseId = typeof query.courseId === 'string' ? query.courseId : ''
        if (!courseId.trim()) {
          set.status = 400
          return '<h1>Course ID is required</h1>'
        }
        return renderAssignmentList(courseId)
      })
      .get('/assignments/new', ({ query }) =>
        renderCreateAssignmentForm({
          courseId: typeof query.courseId === 'string' ? query.courseId : '',
        }),
      )
      .post(
        '/assignments/new',
        async ({ body, request }) => {
          const checked = await gate(request, body.courseId ?? '')
          if ('error' in checked) return checked.error
          if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
            return forbidden('Instructor access required.')
          const result = createAssignment(body, checked.actor.id, database)
          if (!result.ok) return html(400, renderCreateAssignmentForm(body, result.errors))
          return html(
            201,
            `<h1>Assignment Created Successfully</h1><p><strong>${escapeHtml(result.assignment.title)}</strong> has been created.</p>
        <p><strong>Assignment ID:</strong> ${escapeHtml(result.assignment.id)}</p>
        <p><a href="${detailsPath(result.assignment.id)}">View assignment details</a></p>
        <p><a href="${base}/assignments?courseId=${encodeURIComponent(result.assignment.courseId)}">Back to assignments</a></p>`,
          )
        },
        {
          body: t.Object({
            courseId: t.Optional(t.String()),
            title: t.Optional(t.String()),
            description: t.Optional(t.String()),
            dueDate: t.Optional(t.String()),
            maxAttempts: t.Optional(t.String()),
          }),
        },
      )
      .get('/assignments/:id', async ({ params, request }) => {
        const item = assignment(params.id)
        if (!item) return missing('Assignment')
        const actor = await resolveActor(request)
        const course = await resolveCourse(item.courseId)
        return renderAssignmentDetails(item, !!actor && !!course && canManage(actor, course))
      })
      .get('/assignments/:id/due-date', async ({ params, request }) => {
        const item = assignment(params.id)
        if (!item) return missing('Assignment')
        const checked = await gate(request, item.courseId)
        if ('error' in checked) return checked.error
        if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
          return forbidden()
        return renderDueDateForm(item, toDateTimeLocalValue(item.dueAt))
      })
      .post(
        '/assignments/:id/due-date',
        async ({ params, body, request }) => {
          const item = assignment(params.id)
          if (!item) return missing('Assignment')
          const checked = await gate(request, item.courseId)
          if ('error' in checked) return checked.error
          if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
            return forbidden()
          const changed = setAssignmentDueDate({ ...item, dueDate: item.dueAt }, body.dueDate)
          if (!changed.ok)
            return html(400, renderDueDateForm(item, body.dueDate ?? '', changed.error))
          const updated = updateAssignmentDueDate(item.id, changed.assignment.dueDate, database)
          if (!updated) return missing('Assignment')
          return assignmentPage(
            'Due date saved',
            `<h1>Due date saved</h1><p><strong>${escapeHtml(item.title)}</strong> is now due
        ${escapeHtml(formatDueDate(updated.dueDate))}.</p>
        <p>Stored as: <code>${escapeHtml(updated.dueDate)}</code></p>
        <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
          )
        },
        { body: t.Object({ dueDate: t.Optional(t.String()) }) },
      )

      // Instructor-approved extensions; each submission snapshots its effective deadline.
      .get('/assignments/:id/accommodations', async ({ params, request }) => {
        const item = assignment(params.id)
        if (!item) return missing('Assignment')
        const checked = await gate(request, item.courseId)
        if ('error' in checked) return checked.error
        if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
          return forbidden()
        return renderAccommodationsPage(item)
      })
      .post(
        '/assignments/:id/accommodations',
        async ({ params, body, request }) => {
          const item = assignment(params.id)
          if (!item) return missing('Assignment')
          const checked = await gate(request, item.courseId)
          if ('error' in checked) return checked.error
          if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
            return forbidden()
          if (!body.studentId || !checked.course.enrollments.includes(body.studentId))
            return html(400, '<h1>Student is not enrolled.</h1>')
          const date = parseDueDateInput(body.extendedDueAt)
          if (!date.ok)
            return html(400, `<h1>Invalid extension</h1><p>${escapeHtml(date.error)}</p>`)
          if (Date.parse(date.dueDate) <= Date.parse(item.dueAt))
            return html(400, '<h1>Extension must be after the assignment deadline.</h1>')
          const reason = (body.reason ?? '').trim()
          if (!reason || reason.length > 500)
            return html(400, '<h1>Reason is required (up to 500 characters).</h1>')
          saveAccommodation(database, {
            id: getAccommodation(database, item.id, body.studentId)?.id ?? crypto.randomUUID(),
            assignmentId: item.id,
            studentId: body.studentId,
            extendedDueAt: date.dueDate,
            reason,
            grantedBy: checked.actor.id,
          })
          return assignmentPage(
            'Accommodation saved',
            `<h1>Accommodation saved</h1>
        <p>Student ${escapeHtml(body.studentId)} can submit until ${escapeHtml(formatDueDate(date.dueDate))}.</p>
        <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
          )
        },
        {
          body: t.Object({ studentId: t.String(), extendedDueAt: t.String(), reason: t.String() }),
        },
      )
      .post(
        '/assignments/:id/accommodations/remove',
        async ({ params, body, request }) => {
          const item = assignment(params.id)
          if (!item) return missing('Assignment')
          const checked = await gate(request, item.courseId)
          if ('error' in checked) return checked.error
          if (!checked.actor || !checked.course || !canManage(checked.actor, checked.course))
            return forbidden()
          const removed = body.studentId
            ? deleteAccommodation(database, item.id, body.studentId)
            : false
          return assignmentPage(
            removed ? 'Accommodation removed' : 'No accommodation removed',
            `<h1>${removed ? 'Accommodation removed' : 'No accommodation to remove'}</h1>
        ${removed ? `<p>Student ${escapeHtml(body.studentId)} is back to the class deadline.</p>` : ''}
        <p><a href="${detailsPath(item.id)}/accommodations">Back to accommodations</a></p>
        <p><a href="${detailsPath(item.id)}">Back to assignment</a></p>`,
          )
        },
        { body: t.Object({ studentId: t.String() }) },
      )

      // Sprint 2 + Sprint 3 submission routes. Static /history precedes /:receipt.
      .get('/assignments/:id/submissions', async ({ params, request }) => {
        const item = assignment(params.id)
        if (!item) return missing('Assignment')
        const checked = await gate(request, item.courseId)
        if ('error' in checked) return checked.error
        if (!checked.actor || !checked.course || !canSubmit(checked.actor, checked.course))
          return forbidden('Only an enrolled student can submit.')
        const accommodation = getAccommodation(database, item.id, checked.actor.id)
        return renderSubmissionForm(item, effectiveDueDate(item, accommodation))
      })
      .post(
        '/assignments/:id/submissions',
        async ({ params, request }) => {
          const item = assignment(params.id)
          if (!item) return missing('Assignment')
          const checked = await gate(request, item.courseId)
          if ('error' in checked) return checked.error
          if (!checked.actor || !checked.course || !canSubmit(checked.actor, checked.course))
            return forbidden('Only an enrolled student can submit.')
          const studentDueAt = effectiveDueDate(
            item,
            getAccommodation(database, item.id, checked.actor.id),
          )
          const invalidUpload = (status: number, error: string) =>
            html(status, renderSubmissionForm(item, studentDueAt, error))
          if (Number(request.headers.get('content-length')) > MAX_FILE_BYTES + 64 * 1024) {
            return invalidUpload(413, 'Files must be 5 MB or smaller.')
          }
          let form: Awaited<ReturnType<typeof request.formData>>
          try {
            form = await request.formData()
          } catch {
            return invalidUpload(400, 'Choose a file using the upload form.')
          }
          const files = form.getAll('file')
          if (files.length !== 1) return invalidUpload(400, 'Choose one file per submission.')
          const file = files[0]
          try {
            const result = await store.submit(
              item.id,
              file instanceof File ? file : undefined,
              checked.actor.id,
            )
            if (!result.ok) return invalidUpload(result.status, result.error)
            return new Response(null, {
              status: 303,
              headers: { location: `${submissionPath(item.id)}/${result.submission.id}` },
            })
          } catch {
            return invalidUpload(500, 'Unable to save your submission. Please try again.')
          }
        },
        { parse: 'none' },
      )
      .get('/assignments/:id/submissions/history', async ({ params, request, query }) => {
        const item = assignment(params.id)
        if (!item) return missing('Assignment')
        const checked = await authorizeSubmission(request, item)
        if ('error' in checked) return checked.error
        if (!checked.actor || !checked.course) return forbidden()
        const studentId = canViewHistory(checked.actor)
          ? typeof query.studentId === 'string'
            ? query.studentId
            : ''
          : checked.actor.id
        if (!studentId)
          return html(
            400,
            '<h1>Choose a student</h1><p>Instructors: add ?studentId=... to the history URL.</p>',
          )
        return historyFor(item, store.history(item.id, studentId), studentId)
      })
      .get('/api/assignments/:id/submissions', async ({ params, request, query }) => {
        const item = assignment(params.id)
        if (!item) return Response.json({ error: 'Assignment not found.' }, { status: 404 })
        const checked = await authorizeSubmission(request, item)
        if ('error' in checked) return checked.error
        if (!checked.actor || !checked.course) return forbidden()
        const studentId = canViewHistory(checked.actor)
          ? typeof query.studentId === 'string'
            ? query.studentId
            : ''
          : checked.actor.id
        if (!studentId) return Response.json({ error: 'Student ID is required.' }, { status: 400 })
        return {
          assignmentId: item.id,
          studentId,
          maxAttempts: item.maxAttempts,
          submissions: store
            .history(item.id, studentId)
            .map(({ filePath, ...publicRow }) => publicRow),
        }
      })
      .get('/assignments/:id/submissions/:receipt', async ({ params, request }) => {
        const item = assignment(params.id)
        const row = store.find(params.id, params.receipt)
        if (!item || !row) return missing('Submission')
        const checked = await authorizeSubmission(request, item, row)
        if ('error' in checked) return checked.error
        return new Response(renderSubmissionReceipt(row), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      })
      .get('/assignments/:id/submissions/:receipt/file', async ({ params, request }) => {
        const item = assignment(params.id)
        const row = store.find(params.id, params.receipt)
        if (!item || !row) return missing('Submission')
        const checked = await authorizeSubmission(request, item, row)
        if ('error' in checked) return checked.error
        // Only serve files under the module-owned uploads directory.
        const root = resolve(uploadDirectory)
        const actual = resolve(row.filePath)
        if (!actual.startsWith(root + sep)) return missing('Submission')
        const file = Bun.file(actual)
        if (!(await file.exists())) return missing('Submission file')
        const safeName = row.fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
        return new Response(file, {
          headers: {
            'content-type': 'application/octet-stream',
            'content-disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
            'x-content-type-options': 'nosniff',
            'cache-control': 'no-store',
          },
        })
      })
  )
}

export default defineModule({
  name: 'Module 4: Assignment & Submission System',
  description: 'Assignments, submissions, history and accommodations',
  router: createAssignmentsRouter(),
})
