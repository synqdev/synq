/**
 * Bookings API Route
 *
 * POST: Creates a new booking
 */

import { NextRequest, NextResponse, after } from 'next/server'
import { createBooking } from '@/lib/services/booking.service'
import { formatInTimeZone } from '@/lib/utils/time'
import { sendBookingConfirmation } from '@/lib/email/send'
import { z } from 'zod'
import { getLocaleDateTag } from '@/lib/i18n/locale'

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  workerId: z.string().min(1),
  customerId: z.string().min(1),
  resourceId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

/**
 * POST /api/bookings
 *
 * Creates a new booking with double-bottleneck validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Booking API] Received request:', body)

    // Validate request body
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[Booking API] Validation failed:', parsed.error.flatten())
      return NextResponse.json(
        { error: 'Invalid booking data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { serviceId, workerId, customerId, resourceId, startsAt, endsAt } = parsed.data
    console.log('[Booking API] Creating booking:', { serviceId, workerId, customerId, resourceId, startsAt, endsAt })

    // Extract date and time parts in the business timezone
    // This ensures that "15:00 JST" isn't converted to "22:00 PST" (previous day)
    const startParts = formatInTimeZone(startsAt)
    const endParts = formatInTimeZone(endsAt)

    // Create booking using service layer
    // The service layer will accept these "local" times and re-combine them
    // using toZonedTime (which we verified creates the correct UTC instant)
    const result = await createBooking({
      serviceId,
      workerId,
      customerId,
      resourceId,
      date: startParts.date,
      startTime: startParts.time,
      endTime: endParts.time,
    })

    if (!result.success) {
      console.error('[Booking API] Booking creation failed:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 409 } // Conflict
      )
    }

    console.log('[Booking API] Booking created successfully:', result.booking.id)

    const booking = result.booking

    // Get locale from request (default to 'ja')
    const locale = request.headers.get('Accept-Language')?.startsWith('en') ? 'en' : 'ja'

    // Format date for email — use the original startsAt timestamp with business timezone
    // to avoid day-shift on non-UTC runtimes when parsing a bare YYYY-MM-DD string
    const formattedDate = new Intl.DateTimeFormat(getLocaleDateTag(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Tokyo',
    }).format(new Date(startsAt))

    // Schedule email after response is sent (Next.js 15 `after()`)
    // This ensures the email side-effect survives serverless function shutdown
    after(async () => {
      try {
        const emailResult = await sendBookingConfirmation({
          to: booking.customer.email,
          customerName: booking.customer.name,
          serviceName: booking.service.name,
          workerName: booking.worker.name,
          date: formattedDate,
          time: startParts.time,
          locale: locale as 'ja' | 'en',
        })
        if (emailResult) {
          console.log('[Booking API] Email sent successfully:', emailResult.id)
        }
      } catch (err) {
        console.error('[Booking API] Failed to send booking confirmation email:', err)
      }
    })

    return NextResponse.json({ booking: { id: booking.id } }, { status: 201 })
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
