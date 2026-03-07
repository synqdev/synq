'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { workerScheduleSchema } from '@/lib/validations/worker-schedule'
import { ZodError } from 'zod'

export async function upsertWorkerSchedule(
  workerId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
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
    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join('; ') }
    }
    throw error
  }
}
