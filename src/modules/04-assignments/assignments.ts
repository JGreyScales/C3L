import type { Database } from 'bun:sqlite'
import { db } from './db/database'
import {
  getAssignment,
  listAssignments,
  saveAssignment,
  type AssignmentRecord,
} from './db/repository'

/** Legacy Sprint 1 presentation model. The single persisted deadline is dueAt. */
export interface Assignment {
  id: string
  courseId: string
  title: string
  description: string
  dueDate: string
  dueAt?: string
  maxAttempts?: number
  createdBy?: string
}

export function toAssignment(record: AssignmentRecord): Assignment {
  return {
    ...record,
    // The existing due-date helpers and tests use dueDate. Do not persist a second deadline.
    dueDate: record.dueAt,
  }
}

export function listAssignmentsByCourse(
  courseId: string,
  assignments?: readonly Assignment[],
): Assignment[] {
  if (!courseId.trim()) return []
  if (assignments) return assignments.filter((item) => item.courseId === courseId)
  return listAssignments(db, courseId).map(toAssignment)
}

export function getAssignmentById(
  id: string,
  assignments?: readonly Assignment[],
): Assignment | undefined {
  if (assignments) return assignments.find((item) => item.id === id)
  const record = getAssignment(db, id)
  return record ? toAssignment(record) : undefined
}

/** Legacy createAssignment helper; the actual DB contract uses dueAt. */
export function addAssignment(assignment: Assignment, database: Database = db): void {
  saveAssignment(database, {
    id: assignment.id,
    courseId: assignment.courseId,
    title: assignment.title,
    description: assignment.description,
    dueAt: assignment.dueAt ?? assignment.dueDate,
    maxAttempts: assignment.maxAttempts ?? 3,
    createdBy: assignment.createdBy ?? 'demo-instructor',
  })
}

export function updateAssignmentDueDate(
  id: string,
  dueAt: string,
  database: Database = db,
): Assignment | undefined {
  const record = getAssignment(database, id)
  if (!record) return undefined
  saveAssignment(database, { ...record, dueAt })
  return toAssignment({ ...record, dueAt })
}
