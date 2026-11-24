import type { Database } from 'bun:sqlite'
import { db } from './db/database'
import { addAssignment, type Assignment } from './assignments'
import { parseDueDateInput } from './dueDate'

/** The HTML form still names the input dueDate for Sprint 1 compatibility. */
export interface AssignmentInput {
  courseId?: string
  title?: string
  description?: string
  dueDate?: string
  maxAttempts?: string
}

export interface AssignmentFieldErrors {
  courseId?: string
  title?: string
  description?: string
  dueDate?: string
  maxAttempts?: string
}

export type AssignmentValidationResult =
  | {
      ok: true
      values: {
        courseId: string
        title: string
        description: string
        dueDate: string
        maxAttempts: number
      }
    }
  | { ok: false; errors: AssignmentFieldErrors }

export function validateAssignmentInput(input: AssignmentInput): AssignmentValidationResult {
  const errors: AssignmentFieldErrors = {}
  const courseId = (input.courseId ?? '').trim()
  const title = (input.title ?? '').trim()
  const description = (input.description ?? '').trim()
  if (!courseId) errors.courseId = 'Course ID is required.'
  if (!title) errors.title = 'Title is required.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'
  if (!description) errors.description = 'Description is required.'
  else if (description.length > 5000)
    errors.description = 'Description must be 5000 characters or fewer.'
  const dueDateResult = parseDueDateInput(input.dueDate)
  if (!dueDateResult.ok) errors.dueDate = dueDateResult.error
  const maxAttempts =
    input.maxAttempts === undefined || input.maxAttempts.trim() === ''
      ? 3
      : Number(input.maxAttempts)
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 50) {
    errors.maxAttempts = 'Maximum attempts must be a whole number between 1 and 50.'
  }
  if (Object.keys(errors).length > 0 || !dueDateResult.ok) return { ok: false, errors }
  return {
    ok: true,
    values: { courseId, title, description, dueDate: dueDateResult.dueDate, maxAttempts },
  }
}

/** The route passes the verified instructor ID. Unit tests may use a demo creator. */
export function createAssignment(
  input: AssignmentInput,
  createdBy = 'demo-instructor',
  database: Database = db,
): { ok: true; assignment: Assignment } | { ok: false; errors: AssignmentFieldErrors } {
  const validation = validateAssignmentInput(input)
  if (!validation.ok) return { ok: false, errors: validation.errors }
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    courseId: validation.values.courseId,
    title: validation.values.title,
    description: validation.values.description,
    dueDate: validation.values.dueDate,
    dueAt: validation.values.dueDate,
    maxAttempts: validation.values.maxAttempts,
    createdBy,
  }
  addAssignment(assignment, database)
  return { ok: true, assignment }
}
