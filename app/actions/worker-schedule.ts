'use server'

/**
 * Worker Schedule Server Actions
 *
 * Server-side handlers for worker recurring schedule management:
 * - Upsert all 7 days of a worker's weekly schedule
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { workerScheduleSchema } from '@/lib/validations/worker-schedule'
import { ZodError } from 'zod'

/**
 * Upsert all 7 days of a worker's recurring schedule.
 *
 * WorkerSchedule has a unique constraint on (workerId, dayOfWeek), so each
 * day is upserted atomically inside a single transaction.
 *
 * Form fields expected: day_0_startTime, day_0_endTime, day_0_isAvailable, ... day_6_*
 *
 * @param workerId - UUID of the worker
 * @param formData - Form data with day_N_startTime, day_N_endTime, day_N_isAvailable (N=0-6)
 * @returns Success status or error message
 */
export async function upsertWorkerSchedule(
  workerId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await getAdminSession()
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const worker = await prisma.worker.findUnique({ where: { id: workerId } })
    if (!worker) return { success: false, error: 'Worker not found' }

    const readString = (key: string, fallback: string) => {
      const value = formData.get(key)
      return typeof value === 'string' ? value : fallback
    }

    const schedules = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: readString(`day_${i}_startTime`, '09:00'),
      endTime: readString(`day_${i}_endTime`, '18:00'),
      isAvailable: formData.get(`day_${i}_isAvailable`) === 'true',
    }))

    const parsed = workerScheduleSchema.parse(schedules)

    await prisma.$transaction(async (tx) => {
      for (const schedule of parsed) {
        await tx.workerSchedule.upsert({
          where: {
            workerId_dayOfWeek: { workerId, dayOfWeek: schedule.dayOfWeek },
          },
          update: {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
          },
          create: {
            workerId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
            specificDate: null,
          },
        })
      }
    })

    revalidatePath('/[locale]/admin/workers', 'page')
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Validation failed' }
    }
    return { success: false, error: 'Failed to save schedule' }
  }
}
