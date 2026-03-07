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
import { toZonedTime } from '@/lib/utils/time'
import { createBooking } from '@/lib/services/booking.service'

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

  revalidatePath('/[locale]/admin/dashboard', 'page')
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

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

/**
 * Block a worker's time slot.
 *
 * Creates a booking using system entities (SYSTEM_BLOCKER customer + BLOCK_SERVICE).
 * This prevents user bookings during the blocked period through the double-bottleneck logic.
 * Blocked time appears as bookings on the admin calendar.
 *
 * @param formData - Form data with workerId, date, startTime, endTime
 * @returns Success status with the created booking ID
 * @throws Error if not authenticated or validation fails
 */
export async function blockWorkerTime(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = blockTimeSchema.parse(raw)

  // Parse start and end times
  // We use toZonedTime to ensure dates are created in the business timezone
  const dateStr = parsed.date.toISOString().split('T')[0]
  const startsAt = toZonedTime(dateStr, parsed.startTime)
  const endsAt = toZonedTime(dateStr, parsed.endTime)

  // Create booking with system entities
  // Note: resourceId is omitted for block bookings (doesn't require specific resource)
  // However, schema requires it, so we attach the first available resource
  const resource = await prisma.resource.findFirst()
  if (!resource) throw new Error('No resource available for blocking')

  const booking = await prisma.booking.create({
    data: {
      customerId: '00000000-0000-0000-0000-000000000000', // SYSTEM_BLOCKER
      serviceId: 'block-service', // BLOCK_SERVICE
      workerId: parsed.workerId,
      resourceId: resource.id,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
    },
  })

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, bookingId: booking.id }
}

/**
 * Remove a blocked time slot.
 *
 * Deletes the booking created by blockWorkerTime.
 * Only works for system block bookings (BLOCK_SERVICE).
 *
 * @param bookingId - UUID of the booking to delete
 * @returns Success status
 * @throws Error if not authenticated or booking not found
 */
export async function removeBlockedTime(bookingId: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  // Verify this is a system block booking before deleting
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { serviceId: true },
  })

  if (booking?.serviceId !== 'block-service') {
    throw new Error('Not a system block booking')
  }

  await prisma.booking.delete({
    where: { id: bookingId },
  })

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

export interface SendBookingInput {
  bookingId: string
  workerId: string
  date: string
  startTime: string
}

export async function sendBooking(input: SendBookingInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const existing = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { startsAt: true, endsAt: true },
  })

  if (!existing) {
    throw new Error('Booking not found')
  }

  const startsAt = toZonedTime(input.date, input.startTime)
  const durationMs = existing.endsAt.getTime() - existing.startsAt.getTime()
  const endsAt = new Date(startsAt.getTime() + durationMs)

  await prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      workerId: input.workerId,
      startsAt,
      endsAt,
    },
  })

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

export interface CreateAdminBookingInput {
  customerId: string
  workerId: string
  serviceId: string
  date: string
  startTime: string
  endTime: string
  resourceId?: string
}

export async function createAdminBooking(input: CreateAdminBookingInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await createBooking(input)
  if (!result.success) {
    throw new Error(result.error)
  }

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, bookingId: result.booking.id }
}
