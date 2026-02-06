/**
 * Bookings API Route
 *
 * POST: Creates a new booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/services/booking.service'
import { formatInTimeZone } from '@/lib/utils/time'
import { z } from 'zod'

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

    // Validate request body
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { serviceId, workerId, customerId, resourceId, startsAt, endsAt } = parsed.data

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
      return NextResponse.json(
        { error: result.error },
        { status: 409 } // Conflict
      )
    }

    return NextResponse.json({ booking: result.booking }, { status: 201 })
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
