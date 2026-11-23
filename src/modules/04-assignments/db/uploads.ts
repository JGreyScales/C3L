import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'

export const DEFAULT_UPLOADS_DIR = `${import.meta.dir}/../data/uploads`

/** Writes uploaded bytes to an unpredictable filename, not the user-supplied name. */
export async function saveUploadedFile(
  file: File,
  uploadDirectory: string = DEFAULT_UPLOADS_DIR,
): Promise<string> {
  mkdirSync(uploadDirectory, { recursive: true })
  const extension = extname(file.name).toLowerCase()
  if (extension !== '.pdf' && extension !== '.txt') {
    throw new Error('Only PDF and TXT files are supported.')
  }
  const path = join(uploadDirectory, `${randomUUID()}${extension}`)
  await Bun.write(path, file)
  return path
}
