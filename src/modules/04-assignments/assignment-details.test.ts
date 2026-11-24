import { describe, expect, test } from 'bun:test'
import { getAssignmentById, type Assignment } from './assignments'

const assignments: Assignment[] = [
  {
    id: '101',
    courseId: 'CSCN73030',
    title: 'Design Sprint 1',
    description: 'Complete Sprint 1 deliverables.',
    dueDate: '2026-10-20T23:59:00-04:00',
  },
]

describe('M04-FR-004: Assignment details', () => {
  test('finds an assignment by ID', () => {
    const result = getAssignmentById('101', assignments)

    expect(result?.title).toBe('Design Sprint 1')
    expect(result?.description).toBe('Complete Sprint 1 deliverables.')
    expect(result?.dueDate).toBe('2026-10-20T23:59:00-04:00')
  })

  test('returns undefined for an unknown assignment', () => {
    expect(getAssignmentById('999', assignments)).toBeUndefined()
  })
})
