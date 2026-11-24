/** Run explicitly: bun src/modules/04-assignments/db/seed.ts */
import { db } from './database'
import { getAssignment, saveAssignment } from './repository'

const id = 'assignment-001'
const courseId = process.env.M04_DEMO_COURSE_ID ?? '1'
const createdBy = process.env.M04_DEMO_INSTRUCTOR_ID ?? 'demo-instructor'
if (!getAssignment(db, id)) {
  saveAssignment(db, {
    id,
    courseId,
    title: 'Sprint 3 Demo Assignment',
    description: 'Submit a PDF or TXT file, then submit a revised version.',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    maxAttempts: 3,
    createdBy,
  })
  console.log(`Seeded ${id} in course ${courseId}`)
} else {
  console.log(`${id} already exists; no changes made`)
}
