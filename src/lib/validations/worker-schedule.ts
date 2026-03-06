import { z } from 'zod'

const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: 'Time must be in HH:MM format (00:00-23:59)',
})

export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: hhmmSchema.optional(),
    endTime: hhmmSchema.optional(),
    isAvailable: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.isAvailable) return
    if (!data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time is required when available',
        path: ['startTime'],
      })
      return
    }
    if (!data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time is required when available',
        path: ['endTime'],
      })
      return
    }
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End time must be after start time',
        path: ['endTime'],
      })
    }
  })

export const workerScheduleSchema = z
  .array(dayScheduleSchema)
  .length(7)
  .superRefine((days, ctx) => {
    const uniqueDays = new Set(days.map((d) => d.dayOfWeek))
    if (uniqueDays.size !== 7 || ![0, 1, 2, 3, 4, 5, 6].every((d) => uniqueDays.has(d))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Schedule must contain each dayOfWeek exactly once (0-6)',
      })
    }
  })

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>
export type WorkerScheduleInput = z.infer<typeof workerScheduleSchema>
