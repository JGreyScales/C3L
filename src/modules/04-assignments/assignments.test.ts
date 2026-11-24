import { describe, expect, test } from 'bun:test'
import { listAssignmentsByCourse, type Assignment } from './assignments'

const assignments: Assignment[] = [
  {
    id: '1',
    courseId: 'CSCN73030',
    title: 'Assignment A',
    description: 'Description A',
    dueDate: '2026-10-20T23:59:00-04:00',
  },
  {
    id: '2',
    courseId: 'CSCN73030',
    title: 'Assignment B',
    description: 'Description B',
    dueDate: '2026-10-25T23:59:00-04:00',
  },
  {
    id: '3',
    courseId: 'CSCN73010',
    title: 'Assignment C',
    description: 'Description C',
    dueDate: '2026-10-30T23:59:00-04:00',
  },
]

describe('M04-FR-003: View assignments', () => {
  test('returns assignments for the selected course', () => {
    const result = listAssignmentsByCourse('CSCN73030', assignments)

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.title)).toEqual(['Assignment A', 'Assignment B'])
  })

  test('does not return assignments from another course', () => {
    const result = listAssignmentsByCourse('CSCN73010', assignments)

    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('Assignment C')
  })

  test('returns an empty list for a course with no assignments', () => {
    expect(listAssignmentsByCourse('UNKNOWN', assignments)).toEqual([])
  })

  test('returns an empty list when course ID is missing', () => {
    expect(listAssignmentsByCourse('', assignments)).toEqual([])
  })
})
