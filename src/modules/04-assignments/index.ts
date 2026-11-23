// MODULE 4: Assignment & Submission System
//
// Scope from the project brief:
//   - Create assignments
//   - Assignment due dates
//   - File submission
//   - Resubmission rules
//   - Submission history
//   - Late submission tracking
//   - Handle accommodations
//
// HOW TO ADD A PAGE TO THE ROUTER (basic demo):
//   1. Find the router at the bottom of this file.
//   2. Copy the  .get('/hello', ...)  line.
//   3. Change the address ('/hello') and the HTML it returns.
//   4. Save. Your new page is at  http://localhost:3000/04-assignments/<your-address>
import { Elysia, t } from 'elysia'
import { defineModule, moduleBase } from '../../core/defineModule'
import { escapeHtml } from '../../core/pages'
import { assignmentPage } from './layout'
import { createSubmissionStore, MAX_FILE_BYTES, type Submission } from './submissions'
import { listAssignmentsByCourse, getAssignmentById } from './assignments'
import { formatDueDate, setAssignmentDueDate, toDateTimeLocalValue } from './dueDate'
import {
  createAssignment,
  type AssignmentInput,
  type AssignmentFieldErrors,
} from './createAssignment'

const base = moduleBase(import.meta.dir)
const submissions = createSubmissionStore()

// M04-FR-003: Display assignments associated with a course
function renderAssignmentList(courseId: string): string {
  const assignments = listAssignmentsByCourse(courseId)

  const items = assignments
    .map(
      (assignment) => `
        <li>
          <a href="${base}/assignments/${encodeURIComponent(assignment.id)}">
            <strong>${escapeHtml(assignment.title)}</strong>
          </a>
          <span> — Due: ${escapeHtml(formatDueDate(assignment.dueDate))}</span>
        </li>
      `,
    )
    .join('')

  return assignmentPage(
    'Assignments',
    `
    <h1>Assignments</h1>
    <p class="facts">Course: <strong>${escapeHtml(courseId)}</strong></p>
    ${
      assignments.length
        ? `<ul class="assignment-list">${items}</ul>`
        : '<p>No assignments found for this course.</p>'
    }
    <p>
  <a href="${base}/assignments/new?courseId=${encodeURIComponent(courseId)}">
    Create assignment
  </a>
</p>
    <p><a href="${base}">Back to Module 4</a></p>
  `,
  )
}

// M04-FR-004: Display the selected assignment's details
function renderAssignmentDetails(id: string): string | null {
  const assignment = getAssignmentById(id)

  if (!assignment) {
    return null
  }

  return assignmentPage(
    assignment.title,
    `
    <h1>${escapeHtml(assignment.title)}</h1>

    <p>
      <strong>Course:</strong>
      ${escapeHtml(assignment.courseId)}
    </p>

    <p>
      <strong>Description:</strong>
      ${escapeHtml(assignment.description)}
    </p>

    <p class="facts">
      <strong>Due date:</strong>
      ${escapeHtml(formatDueDate(assignment.dueDate))}
    </p>

    <div class="actions"><a class="button" href="${submissionPath(assignment.id)}">Submit assignment file</a></div>

    <p>
      <a href="${base}/assignments/${encodeURIComponent(assignment.id)}/due-date">
        Change due date
      </a>
    </p>

    <p>
      <a href="${base}/assignments?courseId=${encodeURIComponent(assignment.courseId)}">
        Back to assignments
      </a>
    </p>
  `,
  )
}

// M04-FR-005: Form to configure an assignment's due date (Toronto time)
function renderDueDateForm(id: string, title: string, value: string, error?: string): string {
  return assignmentPage(
    'Change due date',
    `
    <h1>Due date: ${escapeHtml(title)}</h1>
    ${error ? `<p role="alert"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
    <form method="post" action="${base}/assignments/${encodeURIComponent(id)}/due-date">
      <label for="dueDate">Due date and time (Toronto time)</label>
      <input type="datetime-local" id="dueDate" name="dueDate" value="${escapeHtml(value)}">
      <button type="submit">Save due date</button>
    </form>
    <p><a href="${base}/assignments/${encodeURIComponent(id)}">Back to assignment</a></p>
  `,
  )
}

// M04-FR-001/002: Render the assignment creation form.
function renderCreateAssignmentForm(
  input: AssignmentInput,
  errors: AssignmentFieldErrors = {},
): string {
  const courseId = input.courseId ?? ''
  const title = input.title ?? ''
  const description = input.description ?? ''
  const dueDate = input.dueDate ?? ''

  const errorMessage = (message?: string): string =>
    message ? `<p role="alert"><strong>Error:</strong> ${escapeHtml(message)}</p>` : ''

  return assignmentPage(
    'Create assignment',
    `
    <h1>Create Assignment</h1>

    <p class="facts">Course: <strong>${escapeHtml(courseId)}</strong></p>

    <form method="post" action="${base}/assignments/new">
      <input
        type="hidden"
        name="courseId"
        value="${escapeHtml(courseId)}"
      >

      <div>
        <label for="title">Assignment title</label>
        <input
          type="text"
          id="title"
          name="title"
          value="${escapeHtml(title)}"
          maxlength="200"
        >
        ${errorMessage(errors.title)}
      </div>

      <div>
        <label for="description">Description</label>
        <textarea
          id="description"
          name="description"
          maxlength="5000"
          rows="5"
        >${escapeHtml(description)}</textarea>
        ${errorMessage(errors.description)}
      </div>

      <div>
        <label for="dueDate">Due date and time (Toronto time)</label>
        <input
          type="datetime-local"
          id="dueDate"
          name="dueDate"
          value="${escapeHtml(dueDate)}"
        >
        ${errorMessage(errors.dueDate)}
      </div>

      ${errorMessage(errors.courseId)}

      <button type="submit">Create assignment</button>
    </form>

    <p>
      <a href="${base}/assignments?courseId=${encodeURIComponent(courseId)}">
        Back to assignments
      </a>
    </p>
  `,
  )
}

function submissionPath(assignmentId: string): string {
  return `${base}/assignments/${encodeURIComponent(assignmentId)}/submissions`
}

function renderSubmissionForm(
  assignmentId: string,
  title: string,
  dueDate: string,
  error?: string,
): string {
  return assignmentPage(
    'Submit assignment file',
    `
    <h1>Submit assignment file</h1>
    <div class="facts"><strong>${escapeHtml(title)}</strong><br>Due: ${escapeHtml(formatDueDate(dueDate))}</div>
    <p>Class demo. Use a sample file. Files reset when the server restarts.</p>
    ${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}
    <form method="post" enctype="multipart/form-data" action="${submissionPath(assignmentId)}">
      <label for="file">Assignment file (PDF or TXT, up to 5 MB)</label>
      <input type="file" id="file" name="file" accept=".pdf,.txt" required>
      <button type="submit">Submit file</button>
    </form>
    <p><a href="${base}/assignments/${encodeURIComponent(assignmentId)}">Back to assignment</a></p>
  `,
  )
}

function renderSubmissionReceipt(submission: Submission): string {
  const path = `${submissionPath(submission.assignmentId)}/${submission.id}`
  return assignmentPage(
    'Submission received',
    `
    <h1>Submission received</h1>
    <p class="success">Your file was saved for this demo session.</p>
    <dl class="facts">
      <dt>Receipt ID</dt><dd>${submission.id}</dd>
      <dt>File</dt><dd>${escapeHtml(submission.file.name)}</dd>
      <dt>Received at</dt><dd><time datetime="${submission.submittedAt}">${submission.submittedAt} (UTC)</time></dd>
    </dl>
    <p><a href="${path}">Open receipt</a></p>
    <div class="actions"><a class="button" href="${path}/file">Download submitted file</a></div>
    <p><a href="${base}/assignments/${encodeURIComponent(submission.assignmentId)}">Back to assignment</a></p>
  `,
  )
}

const assignmentNotFound = `
  <h1>Assignment not found</h1>
  <p><a href="${base}">Back to Module 4</a></p>
`

export default defineModule({
  name: 'Module 4: Assignment & Submission System',
  description: 'Assignments, due dates, submissions',

  router: new Elysia()
    // Module 4 homepage
    .get('/', () =>
      assignmentPage(
        'Assignment & Submission System',
        `
        <h1>Module 4: Assignment &amp; Submission System</h1>
        <p>Create and view assignments, set due dates, and submit sample files.</p>

        <p>
          <a class="button" href="${base}/assignments?courseId=CSCN73030">
            View CSCN73030 Assignments
          </a>
        </p>

        <p><a href="/">Back to the home page</a></p>
      `,
      ),
    )

    // M04-FR-003: View course assignments
    .get('/assignments', ({ query, set }) => {
      const courseId = typeof query.courseId === 'string' ? query.courseId : ''

      if (!courseId.trim()) {
        set.status = 400
        return '<h1>Course ID is required</h1>'
      }

      return renderAssignmentList(courseId)
    })

    // M04-FR-001: Display the assignment creation form.
    .get('/assignments/new', ({ query }) => {
      const courseId = typeof query.courseId === 'string' ? query.courseId : ''

      return renderCreateAssignmentForm({ courseId })
    })

    // M04-FR-001/002: Validate and create an assignment.
    .post(
      '/assignments/new',
      ({ body, set }) => {
        const result = createAssignment(body)

        // FR-002: Reject invalid input with actionable errors.
        if (!result.ok) {
          set.status = 400

          return renderCreateAssignmentForm(body, result.errors)
        }

        // FR-001: Confirm successful assignment creation.
        const assignment = result.assignment

        set.status = 201

        return `
          <h1>Assignment Created Successfully</h1>

          <p>
            <strong>${escapeHtml(assignment.title)}</strong>
            has been created.
          </p>

          <p>
            <strong>Assignment ID:</strong>
            ${escapeHtml(assignment.id)}
          </p>

          <p>
            <a href="${base}/assignments/${encodeURIComponent(assignment.id)}">
              View assignment details
            </a>
          </p>

          <p>
            <a href="${base}/assignments?courseId=${encodeURIComponent(assignment.courseId)}">
              Back to assignments
            </a>
          </p>
        `
      },
      {
        body: t.Object({
          courseId: t.Optional(t.String()),
          title: t.Optional(t.String()),
          description: t.Optional(t.String()),
          dueDate: t.Optional(t.String()),
        }),
      },
    )

    // M04-FR-004: View individual assignment details
    .get('/assignments/:id', ({ params, set }) => {
      const details = renderAssignmentDetails(params.id)

      if (details === null) {
        set.status = 404
        return `
          <h1>Assignment not found</h1>
          <p><a href="${base}">Back to Module 4</a></p>
        `
      }

      return details
    })

    .get('/assignments/:id/submissions', ({ params, set }) => {
      const assignment = getAssignmentById(params.id)
      if (!assignment) {
        set.status = 404
        return assignmentNotFound
      }
      return renderSubmissionForm(assignment.id, assignment.title, assignment.dueDate)
    })

    .post(
      '/assignments/:id/submissions',
      async ({ params, request }) => {
        const assignment = getAssignmentById(params.id)
        if (!assignment)
          return new Response(assignmentNotFound, {
            status: 404,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })

        const invalidUpload = (status: number, error: string) =>
          new Response(
            renderSubmissionForm(assignment.id, assignment.title, assignment.dueDate, error),
            { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
          )

        // Allow space for multipart boundaries and metadata in addition to the file.
        if (Number(request.headers.get('content-length')) > MAX_FILE_BYTES + 64 * 1024) {
          return invalidUpload(413, 'Files must be 5 MB or smaller.')
        }

        let form: Awaited<ReturnType<Request['formData']>>
        try {
          form = await request.formData()
        } catch {
          return invalidUpload(400, 'Choose a file using the upload form.')
        }

        const [file, ...extraFiles] = form.getAll('file')
        if (extraFiles.length) return invalidUpload(400, 'Choose one file per submission.')

        const result = submissions.submit(assignment.id, file instanceof File ? file : undefined)
        if (!result.ok) return invalidUpload(result.status, result.error)

        return new Response(null, {
          status: 303,
          headers: { location: `${submissionPath(assignment.id)}/${result.submission.id}` },
        })
      },
      { parse: 'none' },
    )

    .get('/assignments/:id/submissions/:receipt', ({ params, set }) => {
      const submission = submissions.find(params.id, params.receipt)
      if (!submission)
        return new Response('<h1>Submission not found</h1>', {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      set.headers['content-type'] = 'text/html; charset=utf-8'
      set.headers['cache-control'] = 'no-store'
      return renderSubmissionReceipt(submission)
    })

    .get('/assignments/:id/submissions/:receipt/file', ({ params }) => {
      const submission = submissions.find(params.id, params.receipt)
      if (!submission)
        return new Response('<h1>Submission not found</h1>', {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })

      return new Response(submission.file, {
        headers: {
          'content-type': 'application/octet-stream',
          'content-disposition': 'attachment',
          'x-content-type-options': 'nosniff',
          'cache-control': 'no-store',
        },
      })
    })

    // M04-FR-005: Show the due date form
    .get('/assignments/:id/due-date', ({ params, set }) => {
      const assignment = getAssignmentById(params.id)

      if (!assignment) {
        set.status = 404
        return assignmentNotFound
      }

      return renderDueDateForm(
        assignment.id,
        assignment.title,
        toDateTimeLocalValue(assignment.dueDate),
      )
    })

    // M04-FR-005: Save the due date
    .post(
      '/assignments/:id/due-date',
      ({ params, body, set }) => {
        const assignment = getAssignmentById(params.id)

        if (!assignment) {
          set.status = 404
          return assignmentNotFound
        }

        const result = setAssignmentDueDate(assignment, body.dueDate)

        if (!result.ok) {
          set.status = 400
          return renderDueDateForm(
            assignment.id,
            assignment.title,
            body.dueDate ?? '',
            result.error,
          )
        }

        // TEMPORARY (Sprint 1): updates the in-memory sample data until the
        // team's shared assignment storage exists. Resets when the server restarts.
        Object.assign(assignment, result.assignment)

        return `
          <h1>Due date saved</h1>
          <p><strong>${escapeHtml(assignment.title)}</strong> is now due
            ${escapeHtml(formatDueDate(assignment.dueDate))}.</p>
          <p>Stored as: <code>${escapeHtml(assignment.dueDate)}</code></p>
          <p><a href="${base}/assignments/${encodeURIComponent(assignment.id)}">Back to assignment</a></p>
        `
      },
      { body: t.Object({ dueDate: t.Optional(t.String()) }) },
    ),
})
