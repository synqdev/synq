'use server'

/**
 * Admin Booking Server Actions
 *
 * Server-side handlers for admin booking operations:
 * - Cancel booking
 * - Update booking details
 * - Block worker time
 * - Remove blocked time
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { updateBookingSchema, blockTimeSchema } from '@/lib/validations/admin-booking'
import { getAdminSession } from '@/lib/auth/admin'

/**
 * Cancel a booking by setting its status to CANCELLED.
 *
 * @param bookingId - UUID of the booking to cancel
 * @returns Success status
 * @throws Error if not authenticated or booking not found
 */
export async function cancelBooking(bookingId: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/admin/dashboard')
  return { success: true }
}

/**
 * Update booking details (time, worker, status).
 *
 * @param formData - Form data with bookingId and optional fields
 * @returns Success status
 * @throws Error if not authenticated or validation fails
 */
export async function updateBooking(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = updateBookingSchema.parse(raw)

  // If rescheduling, calculate new endsAt based on current duration
  let updateData: Record<string, unknown> = {}

  if (parsed.startsAt) {
    const booking = await prisma.booking.findUnique({
      where: { id: parsed.bookingId },
      select: { startsAt: true, endsAt: true },
    })
    if (booking) {
      const duration = booking.endsAt.getTime() - booking.startsAt.getTime()
      updateData.startsAt = parsed.startsAt
      updateData.endsAt = new Date(parsed.startsAt.getTime() + duration)
    }
  }

  if (parsed.workerId) {
    updateData.workerId = parsed.workerId
  }

  if (parsed.status) {
    updateData.status = parsed.status
  }

  await prisma.booking.update({
    where: { id: parsed.bookingId },
    data: updateData,
  })

  revalidatePath('/admin/dashboard')
  return { success: true }
}

/**
 * Block a worker's time slot.
 *
 * Creates a WorkerSchedule entry with isAvailable=false.
 * This prevents bookings during the blocked period.
 *
 * @param formData - Form data with workerId, date, startTime, endTime
 * @returns Success status with the created schedule ID
 * @throws Error if not authenticated or validation fails
 */
export async function blockWorkerTime(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = blockTimeSchema.parse(raw)

  const schedule = await prisma.workerSchedule.create({
    data: {
      workerId: parsed.workerId,
      specificDate: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      isAvailable: false, // This marks blocked time
    },
  })

  revalidatePath('/admin/dashboard')
  return { success: true, scheduleId: schedule.id }
}

/**
 * Remove a blocked time slot.
 *
 * @param scheduleId - UUID of the WorkerSchedule to delete
 * @returns Success status
 * @throws Error if not authenticated or schedule not found
 */
export async function removeBlockedTime(scheduleId: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  await prisma.workerSchedule.delete({
    where: { id: scheduleId },
  })

  revalidatePath('/admin/dashboard')
  return { success: true }
}
