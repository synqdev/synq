'use server'

/**
 * Booking Server Actions
 *
 * Server-side handlers for booking operations.
 * Integrates with booking service for transactional booking creation.
 * Includes rate limiting to prevent abuse.
 */

import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { createBooking, type BookingResult } from '@/lib/services/booking.service'
import { checkBookingRateLimit } from '@/lib/rate-limit'
import { sendBookingConfirmation } from '@/lib/email/send'

/**
 * Input for creating a booking via direct call.
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
 * Result from booking action.
 */
export type CreateBookingActionResult =
  | { success: true; bookingId: string }
  | { success: false; error: string }

/**
 * State returned from form-based booking action.
 */
export type BookingFormState = {
  error?: string
} | null

/**
 * Creates a booking via direct API call.
 *
 * @param input - Booking details
 * @returns Result with booking ID or error
 */
export async function createBookingAction(
  input: CreateBookingActionInput
): Promise<CreateBookingActionResult> {
  const bookingResult: BookingResult<{ id: string }> = await createBooking(input)

  if (!bookingResult.success) {
    return { success: false, error: bookingResult.error }
  }

  return {
    success: true,
    bookingId: bookingResult.booking.id,
  }
}

/**
 * Creates a booking from form submission and redirects to confirmation.
 *
 * This action:
 * 1. Verifies customer ID from cookie
 * 2. Gets the active service for duration calculation
 * 3. Creates booking using the booking service (with serializable transactions)
 * 4. Redirects to confirmation page on success
 *
 * @param prevState - Previous form state (for progressive enhancement)
 * @param formData - Form submission data (workerId, date, time, resourceId, locale)
 * @returns Error state if creation fails, or redirects on success
 */
export async function submitBookingForm(
  prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  // Rate limit booking submissions by IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
  const rateLimit = await checkBookingRateLimit(ip)

  if (!rateLimit.success) {
    return { error: 'Too many booking attempts. Please wait a moment and try again.' }
  }

  // Get customer ID from cookie
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customerId')?.value
  const locale = (formData.get('locale') as string) || 'ja'

  // If no customer ID, redirect to registration
  if (!customerId) {
    redirect(`/${locale}/register`)
  }

  // Extract form data
  const workerId = formData.get('workerId') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const resourceId = formData.get('resourceId') as string | null

  // Validate required fields
  if (!workerId || !date || !time) {
    return { error: 'Missing required booking information' }
  }

  let confirmedBookingId: string | null = null

  try {
    // Get default service
    const service = await prisma.service.findFirst({ where: { isActive: true } })
    if (!service) {
      return { error: 'No service available' }
    }

    // Calculate end time based on service duration
    const [hours, minutes] = time.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + service.duration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

    // Create booking using booking service
    const result = await createBooking({
      customerId,
      serviceId: service.id,
      workerId,
      resourceId: resourceId || undefined,
      date,
      startTime: time,
      endTime,
    })

    if (!result.success) {
      return { error: result.error }
    }

    confirmedBookingId = result.booking.id

    // Fetch booking details with related data for email
    const booking = await prisma.booking.findUnique({
      where: { id: result.booking.id },
      include: {
        customer: true,
        worker: true,
        service: true,
      },
    })

    if (booking) {
      // Format date for email (YYYY年MM月DD日 for ja, Month DD, YYYY for en)
      const bookingDate = new Date(date)
      const formattedDate = locale === 'ja'
        ? `${bookingDate.getFullYear()}年${bookingDate.getMonth() + 1}月${bookingDate.getDate()}日`
        : bookingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

      // Send confirmation email (non-blocking - fire and forget, failures don't prevent redirect)
      sendBookingConfirmation({
        to: booking.customer.email,
        customerName: booking.customer.name,
        serviceName: booking.service.name,
        workerName: booking.worker.name,
        date: formattedDate,
        time,
        locale: locale as 'ja' | 'en',
      }).catch(() => {
        // Already logged in sendBookingConfirmation
      })
    }
  } catch (error) {
    console.error('Failed to create booking:', error)
    return { error: 'Failed to create booking. Please try again.' }
  }

  // Redirect outside try/catch to avoid Next.js redirect error handling issues
  if (confirmedBookingId) {
    redirect(`/${locale}/booking/confirm?id=${confirmedBookingId}`)
  }

  return { error: 'Failed to create booking. Please try again.' }
}
