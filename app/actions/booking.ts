'use server'

/**
 * Booking Server Actions
 *
 * Server-side handlers for booking operations.
 * Integrates with booking service and email notifications.
 */

import { prisma } from '@/lib/db/client'
import { createBooking, type BookingResult } from '@/lib/services/booking.service'
import { sendBookingConfirmation } from '@/lib/email/send'

/**
 * Input for creating a booking via server action.
 */
export interface CreateBookingActionInput {
  customerId: string
  workerId: string
  serviceId: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  resourceId?: string
}

/**
 * Result from booking action including email status.
 */
export type CreateBookingActionResult =
  | { success: true; bookingId: string; emailSent: boolean }
  | { success: false; error: string }

/**
 * Creates a booking and sends a confirmation email.
 *
 * This action:
 * 1. Calls the booking service to create the booking with proper transaction isolation
 * 2. Fetches customer, worker, and service details for the email
 * 3. Sends a localized confirmation email (failure doesn't block booking)
 *
 * @param input - Booking details
 * @returns Result with booking ID and email status
 *
 * @example
 * const result = await createBookingAction({
 *   customerId: 'uuid',
 *   workerId: 'uuid',
 *   serviceId: 'uuid',
 *   date: '2024-06-15',
 *   startTime: '10:00',
 *   endTime: '11:00',
 * })
 *
 * if (result.success) {
 *   console.log('Booking created:', result.bookingId)
 *   if (result.emailSent) {
 *     console.log('Confirmation email sent')
 *   }
 * }
 */
export async function createBookingAction(
  input: CreateBookingActionInput
): Promise<CreateBookingActionResult> {
  // 1. Create the booking using the service
  const bookingResult: BookingResult<{ id: string }> = await createBooking(input)

  if (!bookingResult.success) {
    return { success: false, error: bookingResult.error }
  }

  const booking = bookingResult.booking
  let emailSent = false

  // 2. Fetch details for email (in parallel)
  try {
    const [customer, worker, service] = await Promise.all([
      prisma.customer.findUnique({ where: { id: input.customerId } }),
      prisma.worker.findUnique({ where: { id: input.workerId } }),
      prisma.service.findUnique({ where: { id: input.serviceId } }),
    ])

    // 3. Send confirmation email if we have all the data
    if (customer && worker && service && customer.email) {
      const locale = (customer.locale as 'ja' | 'en') || 'ja'

      // Parse date for formatting
      const startsAt = new Date(`${input.date}T${input.startTime}:00`)

      const emailResult = await sendBookingConfirmation({
        to: customer.email,
        customerName: customer.name,
        serviceName: locale === 'ja' ? service.name : (service.nameEn || service.name),
        workerName: locale === 'ja' ? worker.name : (worker.nameEn || worker.name),
        date: new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
          dateStyle: 'long',
        }).format(startsAt),
        time: new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
          timeStyle: 'short',
        }).format(startsAt),
        locale,
      })

      emailSent = emailResult !== null
    }
  } catch (error) {
    // Log email error but don't fail the booking
    console.error('[Booking Action] Email notification failed:', error)
  }

  return {
    success: true,
    bookingId: booking.id,
    emailSent,
  }
}
