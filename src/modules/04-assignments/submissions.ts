import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import type { Database } from 'bun:sqlite'
import { db } from './db/database'
import {
  getAccommodation,
  getAssignment,
  getSubmission,
  listAttempts,
  nextAttemptNumber,
  saveSubmission,
  type SubmissionRecord,
} from './db/repository'
import { DEFAULT_UPLOADS_DIR, saveUploadedFile } from './db/uploads'
import { effectiveDueDate, submissionStatus } from './lateness'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
const allowedExtensions = /\.(pdf|txt)$/i
export type Submission = SubmissionRecord
export type SubmissionResult =
  | { ok: true; submission: Submission }
  | { ok: false; status: 400 | 404 | 409 | 413 | 415; error: string }

/** Persistent, per-student submission service. Never trusts a student ID from the upload form. */
export function createSubmissionStore(
  database: Database = db,
  uploadDirectory = DEFAULT_UPLOADS_DIR,
) {
  return {
    async submit(
      assignmentId: string,
      file: File | undefined,
      studentId: string,
    ): Promise<SubmissionResult> {
      if (!studentId.trim()) return { ok: false, status: 400, error: 'Student ID is required.' }
      if (!file?.size) return { ok: false, status: 400, error: 'Choose a non-empty file.' }
      if (file.size > MAX_FILE_BYTES)
        return { ok: false, status: 413, error: 'Files must be 5 MB or smaller.' }
      if (!allowedExtensions.test(file.name))
        return { ok: false, status: 415, error: 'Choose a PDF or TXT file.' }

      const assignment = getAssignment(database, assignmentId)
      if (!assignment) return { ok: false, status: 404, error: 'Assignment not found.' }
      if (nextAttemptNumber(database, assignmentId, studentId) > assignment.maxAttempts) {
        return {
          ok: false,
          status: 409,
          error: `Maximum of ${assignment.maxAttempts} attempts reached.`,
        }
      }

      // Uploads are written first; roll back the file if SQL fails or the attempt limit was reached.
      const filePath = await saveUploadedFile(file, uploadDirectory)
      try {
        const submission = database.transaction((): SubmissionResult => {
          const attemptNumber = nextAttemptNumber(database, assignmentId, studentId)
          if (attemptNumber > assignment.maxAttempts) {
            return {
              ok: false,
              status: 409,
              error: `Maximum of ${assignment.maxAttempts} attempts reached.`,
            }
          }
          const accommodation = getAccommodation(database, assignmentId, studentId)
          const effectiveDueAt = effectiveDueDate(assignment, accommodation)
          const submittedAt = new Date().toISOString()
          const row: SubmissionRecord = {
            id: randomUUID(),
            assignmentId,
            courseId: assignment.courseId,
            studentId,
            attemptNumber,
            fileName: file.name,
            sizeBytes: file.size,
            contentType: file.type || 'application/octet-stream',
            filePath,
            submittedAt,
            effectiveDueAt,
            status: submissionStatus(submittedAt, effectiveDueAt),
          }
          saveSubmission(database, row)
          return { ok: true, submission: row }
        })()
        if (!submission.ok) await unlink(filePath)
        return submission
      } catch (error) {
        await unlink(filePath).catch(() => {})
        throw error
      }
    },

    find(assignmentId: string, receiptId: string): Submission | undefined {
      const submission = getSubmission(database, receiptId)
      return submission?.assignmentId === assignmentId ? submission : undefined
    },

    history(assignmentId: string, studentId: string): Submission[] {
      return listAttempts(database, assignmentId, studentId)
    },
  }
}
