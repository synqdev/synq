/**
 * Worker Schedule Validation Schema
 *
 * Zod schema for validating worker recurring schedule data.
 */

import { z } from 'zod'

const HHMM_24H_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/**
 * Schema for validating a single day's schedule entry.
 *
 * Validates:
 * - dayOfWeek: Integer from 0 (Sunday) to 6 (Saturday)
 * - startTime: HH:MM format string (strict 24-hour clock, e.g. 06:00–23:59)
 * - endTime: HH:MM format string (strict 24-hour clock)
 * - isAvailable: Boolean indicating whether worker is available this day
 *
 * When isAvailable is true, endTime must be after startTime.
 * When isAvailable is false, start/end times are not validated (worker is off).
 */
export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHMM_24H_REGEX, { message: 'Start time must be in HH:MM format' }),
    endTime: z.string().regex(HHMM_24H_REGEX, { message: 'End time must be in HH:MM format' }),
    isAvailable: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.isAvailable) return true
      return data.endTime > data.startTime
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  )

/**
 * Schema for validating a full 7-day weekly schedule.
 *
 * Expects exactly 7 entries, one per day of the week (0=Sunday through 6=Saturday),
 * with no duplicate dayOfWeek values.
 */
export const workerScheduleSchema = z
  .array(dayScheduleSchema)
  .length(7)
  .superRefine((days, ctx) => {
    const seen = new Set<number>()
    for (const day of days) {
      if (seen.has(day.dayOfWeek)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate dayOfWeek value: ${day.dayOfWeek}`,
        })
        return
      }
      seen.add(day.dayOfWeek)
    }
    for (let i = 0; i < 7; i++) {
      if (!seen.has(i)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing schedule entry for dayOfWeek: ${i}`,
        })
      }
    }
  })

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>
export type WorkerScheduleInput = z.infer<typeof workerScheduleSchema>
