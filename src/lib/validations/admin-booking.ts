/**
 * Admin Booking Validation Schemas
 *
 * Zod schemas for validating admin booking operations:
 * - Update booking details
 * - Block worker time
 */

import { z } from 'zod'

/**
 * Time format validation (HH:MM)
 */
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

/**
 * Schema for updating a booking.
 *
 * Validates:
 * - bookingId: Required UUID
 * - startsAt: Optional date (for rescheduling)
 * - workerId: Optional UUID (for reassignment)
 * - status: Optional booking status change
 */
export const updateBookingSchema = z.object({
  bookingId: z.string().uuid({ message: 'Invalid booking ID format' }),
  startsAt: z.coerce.date().optional(),
  workerId: z.string().min(1).optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'NOSHOW', 'PENDING']).optional(),
})

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>

/**
 * Schema for blocking worker time.
 *
 * Creates a WorkerSchedule entry with isAvailable=false.
 *
 * Validates:
 * - workerId: Required UUID
 * - date: Required date
 * - startTime: HH:MM format
 * - endTime: HH:MM format
 */
export const blockTimeSchema = z.object({
  workerId: z.string().min(1, { message: 'Worker ID is required' }),
  date: z.coerce.date(),
  startTime: z.string().regex(timeRegex, { message: 'Start time must be in HH:MM format' }),
  endTime: z.string().regex(timeRegex, { message: 'End time must be in HH:MM format' }),
}).refine(
  (data) => {
    // Validate that endTime is after startTime
    const [startHours, startMinutes] = data.startTime.split(':').map(Number)
    const [endHours, endMinutes] = data.endTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    return endTotalMinutes > startTotalMinutes
  },
  { message: 'End time must be after start time', path: ['endTime'] }
)

export type BlockTimeInput = z.infer<typeof blockTimeSchema>
