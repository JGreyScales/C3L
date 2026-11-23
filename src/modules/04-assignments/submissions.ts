import { randomUUID } from 'node:crypto'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_DEMO_SUBMISSIONS = 20
const allowedExtensions = /\.(pdf|txt)$/i

export interface Submission {
  id: string
  assignmentId: string
  submittedAt: string
  file: File
}

type SubmissionResult =
  | { ok: true; submission: Submission }
  | { ok: false; status: 400 | 413 | 415 | 503; error: string }

/** @brief Bounded prototype storage. Receipts and files expire on process restart. */
export function createSubmissionStore() {
  const submissions = new Map<string, Submission>()

  return {
    /** @brief Validate a file before creating an assignment-specific receipt. */
    submit(assignmentId: string, file?: File): SubmissionResult {
      if (!file?.size) {
        return { ok: false, status: 400, error: 'Choose a non-empty file.' }
      }
      if (file.size > MAX_FILE_BYTES) {
        return { ok: false, status: 413, error: 'Files must be 5 MB or smaller.' }
      }
      if (!allowedExtensions.test(file.name)) {
        return { ok: false, status: 415, error: 'Choose a PDF or TXT file.' }
      }
      if (submissions.size >= MAX_DEMO_SUBMISSIONS) {
        return { ok: false, status: 503, error: 'The demo submission store is full.' }
      }

      const submission = {
        id: randomUUID(),
        assignmentId,
        submittedAt: new Date().toISOString(),
        file,
      }
      submissions.set(submission.id, submission)
      return { ok: true, submission }
    },

    /** @brief Retrieve a receipt only under its original assignment. */
    find(assignmentId: string, submissionId: string): Submission | undefined {
      const submission = submissions.get(submissionId)
      return submission?.assignmentId === assignmentId ? submission : undefined
    },
  }
}
