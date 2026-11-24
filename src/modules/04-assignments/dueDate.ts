// M04-FR-005: Configure assignment due date
//
// "The system shall allow an instructor to configure an assignment due date and time, and shall
//  store and display that date and time using a consistent time-zone interpretation."
//
// Rules used in this file:
//   - Instructors type a local time in the school's time zone (America/Toronto).
//   - We STORE the due date as an ISO 8601 string with an explicit offset,
//     e.g. "2026-10-23T23:59:00-04:00". This matches the Assignment model and is never ambiguous.
//   - We DISPLAY it as readable Toronto time, e.g. "Fri, Oct 23, 2026, 11:59 PM EDT".
//
// Everything here is plain functions with no storage, so it can be reused by the create form
// (FR-001), validation (FR-002), the list and details pages (FR-003, FR-004) and late tracking (FR-009).
import type { Assignment } from './assignments'

export const SCHOOL_TIME_ZONE = 'America/Toronto'

export type DueDateResult = { ok: true; dueDate: string } | { ok: false; error: string }

export const DUE_DATE_ERRORS = {
  missing: 'Due date is required.',
  format: 'Due date must be a date and time, for example 2026-10-23T23:59.',
  calendar: 'Due date is not a real calendar date.',
  dstGap:
    'That time does not exist in Toronto because the clocks move forward for daylight saving time. Choose a different time.',
} as const

// "2026-10-23T23:59" (from <input type="datetime-local">), optionally with seconds,
// optionally with "Z" or an offset like "-04:00".
const DUE_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?$/

const MINUTE = 60_000

// The wall-clock parts (year, month, ...) of a moment as seen in a time zone.
function wallClockParts(utcMillis: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMillis))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

// How many minutes the time zone is ahead of UTC at that moment (Toronto: -240 in summer, -300 in winter).
function offsetMinutes(utcMillis: number, timeZone: string): number {
  const p = wallClockParts(utcMillis, timeZone)
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asIfUtc - Math.floor(utcMillis / 1000) * 1000) / MINUTE)
}

const pad = (n: number) => String(n).padStart(2, '0')

// A moment -> "2026-10-23T23:59:00-04:00" in the given time zone.
function toOffsetIso(utcMillis: number, timeZone: string): string {
  const p = wallClockParts(utcMillis, timeZone)
  const offset = offsetMinutes(utcMillis, timeZone)
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  return (
    `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/**
 * Validates a due date typed by an instructor and turns it into the stored format.
 *
 * - "2026-10-23T23:59"           -> treated as Toronto time -> "2026-10-23T23:59:00-04:00"
 * - "2026-10-24T03:59:00Z"       -> same moment, normalized -> "2026-10-23T23:59:00-04:00"
 * - "", "tomorrow", "2026-02-30T10:00" -> { ok: false, error: "..." }
 *
 * Daylight saving time:
 * - Spring forward (e.g. 2026-03-08 02:30 never happens in Toronto) -> rejected.
 * - Fall back (e.g. 2026-11-01 01:30 happens twice) -> the first one (EDT, -04:00) is used.
 */
export function parseDueDateInput(input: unknown, timeZone = SCHOOL_TIME_ZONE): DueDateResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: DUE_DATE_ERRORS.missing }
  }

  const match = DUE_DATE_PATTERN.exec(input.trim())
  if (!match) return { ok: false, error: DUE_DATE_ERRORS.format }

  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number)
  const second = match[6] ? Number(match[6]) : 0
  const zone = match[7]

  // Date.UTC quietly rolls Feb 30 over to Mar 2, so check the parts survived unchanged.
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second)
  const check = new Date(wallClock)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return { ok: false, error: DUE_DATE_ERRORS.calendar }
  }

  // Input already says which zone it is in ("Z" or "-04:00"): just normalize it.
  if (zone) {
    const utc = Date.parse(input.trim())
    if (Number.isNaN(utc)) return { ok: false, error: DUE_DATE_ERRORS.format }
    return { ok: true, dueDate: toOffsetIso(utc, timeZone) }
  }

  // No zone given: the time is school (Toronto) time.
  // Try both offsets that apply around this date and keep the earliest one that really shows
  // this wall-clock time. If none does, the time falls in the daylight-saving gap.
  const offsets = new Set([
    offsetMinutes(wallClock - 12 * 60 * MINUTE, timeZone),
    offsetMinutes(wallClock + 12 * 60 * MINUTE, timeZone),
  ])
  const candidates = [...offsets]
    .map((offset) => wallClock - offset * MINUTE)
    .filter((utc) => {
      const p = wallClockParts(utc, timeZone)
      return (
        p.year === year &&
        p.month === month &&
        p.day === day &&
        p.hour === hour &&
        p.minute === minute
      )
    })
    .sort((a, b) => a - b)

  if (candidates.length === 0) return { ok: false, error: DUE_DATE_ERRORS.dstGap }
  return { ok: true, dueDate: toOffsetIso(candidates[0], timeZone) }
}

/** Stored due date -> "Fri, Oct 23, 2026, 11:59 PM EDT". Shows "No due date" if it is not valid. */
export function formatDueDate(dueDate: string, timeZone = SCHOOL_TIME_ZONE): string {
  const utc = Date.parse(dueDate)
  if (Number.isNaN(utc)) return 'No due date'
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(utc))
}

/** Stored due date -> "2026-10-23T23:59", to pre-fill <input type="datetime-local">. */
export function toDateTimeLocalValue(dueDate: string, timeZone = SCHOOL_TIME_ZONE): string {
  const utc = Date.parse(dueDate)
  if (Number.isNaN(utc)) return ''
  return toOffsetIso(utc, timeZone).slice(0, 16)
}

export type SetDueDateResult = { ok: true; assignment: Assignment } | { ok: false; error: string }

/**
 * Returns a copy of the assignment with a new due date. Every other field stays the same.
 * The original assignment object is not changed. Saving the copy is up to the storage layer.
 */
export function setAssignmentDueDate(assignment: Assignment, input: unknown): SetDueDateResult {
  const result = parseDueDateInput(input)
  if (!result.ok) return result
  return { ok: true, assignment: { ...assignment, dueDate: result.dueDate } }
}
