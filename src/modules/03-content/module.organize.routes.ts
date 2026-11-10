import { Elysia } from 'elysia'
import type { LearningModule } from './module.model'
import { getLearningModulesByCourse } from './module.service'

export interface ModuleOrganizationFilter {
  week?: number
  topic?: string
}

export const moduleOrganizeRoutes = new Elysia().get(
  '/api/courses/:courseId/modules/organized',
  ({ params, request, set }) => {
    const courseId = params.courseId.trim()
    if (!courseId) {
      set.status = 400
      return { error: 'Course ID is required' }
    }

    const query = new URL(request.url).searchParams
    const rawWeek = query.get('week')
    const filters: ModuleOrganizationFilter = {}
    if (rawWeek !== null) {
      const week = Number(rawWeek)
      // Require decimal digits only; Number alone accepts blanks and exponents.
      if (!/^[0-9]+$/.test(rawWeek) || !Number.isSafeInteger(week) || week < 1) {
        set.status = 400
        return { error: 'Week must be a positive safe integer' }
      }
      filters.week = week
    }
    const topic = query.get('topic')
    if (topic !== null) filters.topic = topic.trim()

    return { modules: listOrganizedModules(courseId, filters) }
  },
)

export function listOrganizedModules(
  courseId: string,
  filters: ModuleOrganizationFilter,
): LearningModule[] {
  if (typeof courseId !== 'string' || !courseId.trim()) {
    throw new Error('Course ID is required')
  }
  if (filters.week !== undefined && (!Number.isInteger(filters.week) || filters.week < 1)) {
    throw new Error('Week must be a positive integer')
  }
  if (filters.topic !== undefined && typeof filters.topic !== 'string') {
    throw new Error('Topic must be a string')
  }

  const topic = filters.topic?.trim().toLowerCase()
  // Select the course before applying organization filters. Clone objects so
  // callers cannot change stored modules through the returned list.
  return getLearningModulesByCourse(courseId.trim())
    .filter((module) =>
      (filters.week === undefined || module.week === filters.week) &&
      (!topic || module.topic?.trim().toLowerCase() === topic),
    )
    .map((module) => ({ ...module }))
    // Array.sort is stable: equal weeks retain service insertion order.
    .sort((left, right) => {
      if (left.week === right.week) return 0
      if (left.week === undefined) return 1
      if (right.week === undefined) return -1
      return left.week - right.week
    })
}
