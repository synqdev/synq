/**
 * Worker Schedule Validation Schema
 *
 * Zod schema for validating worker recurring schedule data.
 */

import { z } from 'zod'

/**
 * Schema for validating a single day's schedule entry.
 *
 * Validates:
 * - dayOfWeek: Integer from 0 (Sunday) to 6 (Saturday)
 * - startTime: HH:MM format string
 * - endTime: HH:MM format string
 * - isAvailable: Boolean indicating whether worker is available this day
 *
 * When isAvailable is true, endTime must be after startTime.
 * When isAvailable is false, start/end times are not validated (worker is off).
 */
export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Start time must be in HH:MM format' }),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, { message: 'End time must be in HH:MM format' }),
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
 * Expects exactly 7 entries, one per day of the week (0=Sunday through 6=Saturday).
 */
export const workerScheduleSchema = z.array(dayScheduleSchema).length(7)

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>
export type WorkerScheduleInput = z.infer<typeof workerScheduleSchema>
