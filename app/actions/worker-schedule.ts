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
 * Uses the findFirst + update/create pattern since WorkerSchedule has no
 * unique constraint on (workerId, dayOfWeek).
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
    if (!isAdmin) throw new Error('Unauthorized')

    const worker = await prisma.worker.findUnique({ where: { id: workerId } })
    if (!worker) throw new Error('Worker not found')

    const schedules = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: (formData.get(`day_${i}_startTime`) as string) || '09:00',
      endTime: (formData.get(`day_${i}_endTime`) as string) || '18:00',
      isAvailable: formData.get(`day_${i}_isAvailable`) === 'true',
    }))

    const parsed = workerScheduleSchema.parse(schedules)

    for (const schedule of parsed) {
      const existing = await prisma.workerSchedule.findFirst({
        where: { workerId, dayOfWeek: schedule.dayOfWeek, specificDate: null },
      })
      if (existing) {
        await prisma.workerSchedule.update({
          where: { id: existing.id },
          data: {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
          },
        })
      } else {
        await prisma.workerSchedule.create({
          data: {
            workerId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
            specificDate: null,
          },
        })
      }
    }

    revalidatePath('/admin/workers')
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Validation failed' }
    }
    throw error
  }
}
