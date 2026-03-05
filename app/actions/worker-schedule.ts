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
 * Uses a transaction with findFirst + update/create since WorkerSchedule has no
 * unique constraint on (workerId, dayOfWeek). A partial unique index on the DB
 * would allow using upsert directly.
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
  const isAdmin = await getAdminSession()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker) return { success: false, error: 'Worker not found' }

  const schedules = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    startTime: (formData.get(`day_${i}_startTime`) as string) || '09:00',
    endTime: (formData.get(`day_${i}_endTime`) as string) || '18:00',
    isAvailable: formData.get(`day_${i}_isAvailable`) === 'true',
  }))

  try {
    const parsed = workerScheduleSchema.parse(schedules)

    await prisma.$transaction(async (tx) => {
      for (const schedule of parsed) {
        const existing = await tx.workerSchedule.findFirst({
          where: { workerId, dayOfWeek: schedule.dayOfWeek, specificDate: null },
        })
        if (existing) {
          await tx.workerSchedule.update({
            where: { id: existing.id },
            data: {
              startTime: schedule.startTime ?? '09:00',
              endTime: schedule.endTime ?? '18:00',
              isAvailable: schedule.isAvailable,
            },
          })
        } else {
          await tx.workerSchedule.create({
            data: {
              workerId,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime ?? '09:00',
              endTime: schedule.endTime ?? '18:00',
              isAvailable: schedule.isAvailable,
              specificDate: null,
            },
          })
        }
      }
    })

    revalidatePath('/admin/workers')
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'timeValidationError' }
    }
    return { success: false, error: 'saveError' }
  }
}
