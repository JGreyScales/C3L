import { createAssignment, validateAssignmentInput } from './createAssignment'
import { getAssignmentById, listAssignmentsByCourse } from './assignments'
import { describe, expect, test } from 'bun:test'
import { DUE_DATE_ERRORS } from './dueDate'

const validInput = {
  courseId: 'CSCN73030',
  title: 'Assignment 1',
  description: 'Complete the TypeScript assignment.',
  dueDate: '2026-10-23T23:59',
}

describe('M04-FR-002: Validate assignment fields', () => {
  test('accepts valid assignment information', () => {
    const result = validateAssignmentInput(validInput)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.values.title).toBe('Assignment 1')
      expect(result.values.dueDate).toBe('2026-10-23T23:59:00-04:00')
    }
  })

  test('rejects a missing title', () => {
    const result = validateAssignmentInput({
      ...validInput,
      title: '',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.title).toBe('Title is required.')
    }
  })

  test('rejects a whitespace-only title', () => {
    const result = validateAssignmentInput({
      ...validInput,
      title: '   ',
    })

    expect(result.ok).toBe(false)
  })

  test('rejects a title longer than 200 characters', () => {
    const result = validateAssignmentInput({
      ...validInput,
      title: 'A'.repeat(201),
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.title).toBe('Title must be 200 characters or fewer.')
    }
  })

  test('rejects a missing description', () => {
    const result = validateAssignmentInput({
      ...validInput,
      description: '',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.description).toBe('Description is required.')
    }
  })

  test('rejects a missing course ID', () => {
    const result = validateAssignmentInput({
      ...validInput,
      courseId: '',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.courseId).toBe('Course ID is required.')
    }
  })

  test('rejects a missing due date', () => {
    const result = validateAssignmentInput({
      ...validInput,
      dueDate: '',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.dueDate).toBe(DUE_DATE_ERRORS.missing)
    }
  })

  test('rejects an impossible calendar date', () => {
    const result = validateAssignmentInput({
      ...validInput,
      dueDate: '2026-02-30T10:00',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.errors.dueDate).toBe(DUE_DATE_ERRORS.calendar)
    }
  })

  test('trims whitespace from valid text fields', () => {
    const result = validateAssignmentInput({
      ...validInput,
      title: '  Assignment 1  ',
      description: '  Complete the assignment.  ',
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.values.title).toBe('Assignment 1')
      expect(result.values.description).toBe('Complete the assignment.')
    }
  })

  test('reports multiple validation errors together', () => {
    const result = validateAssignmentInput({
      courseId: '',
      title: '',
      description: '',
      dueDate: '',
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(Object.keys(result.errors)).toHaveLength(4)
    }
  })
})

describe('M04-FR-001: Create assignment', () => {
  test('creates a valid assignment with a unique identifier', () => {
    const result = createAssignment(validInput)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.assignment.id).toBeTruthy()
      expect(result.assignment.title).toBe('Assignment 1')
      expect(result.assignment.courseId).toBe('CSCN73030')
      expect(result.assignment.dueDate).toBe('2026-10-23T23:59:00-04:00')
    }
  })

  test('generates different identifiers for two assignments', () => {
    const first = createAssignment(validInput)
    const second = createAssignment(validInput)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    if (first.ok && second.ok) {
      expect(first.assignment.id).not.toBe(second.assignment.id)
    }
  })

  test('saves the assignment so it can be retrieved by ID', () => {
    const result = createAssignment(validInput)

    expect(result.ok).toBe(true)

    if (result.ok) {
      const savedAssignment = getAssignmentById(result.assignment.id)

      expect(savedAssignment).toBeDefined()
      expect(savedAssignment?.title).toBe('Assignment 1')
    }
  })

  test('makes the new assignment available on the course list', () => {
    const result = createAssignment(validInput)

    expect(result.ok).toBe(true)

    if (result.ok) {
      const assignments = listAssignmentsByCourse('CSCN73030')

      expect(assignments.some((assignment) => assignment.id === result.assignment.id)).toBe(true)
    }
  })

  test('does not save an assignment when validation fails', () => {
    const assignmentsBefore = listAssignmentsByCourse('CSCN73030')

    const result = createAssignment({
      ...validInput,
      title: '',
    })

    const assignmentsAfter = listAssignmentsByCourse('CSCN73030')

    expect(result.ok).toBe(false)
    expect(assignmentsAfter.length).toBe(assignmentsBefore.length)

    if (!result.ok) {
      expect(result.errors.title).toBe('Title is required.')
    }
  })
})
