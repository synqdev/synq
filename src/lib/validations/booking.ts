/**
 * Booking Validation Schemas
 *
 * Zod schemas for validating booking input data before database operations.
 * Ensures data integrity and provides type inference for TypeScript.
 */

import { z } from 'zod';

/**
 * Time format validation (HH:MM)
 */
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Date format validation (YYYY-MM-DD)
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schema for creating a new booking.
 *
 * Validates:
 * - customerId: non-empty string (UUID or custom ID)
 * - workerId: non-empty string (UUID or custom ID)
 * - serviceId: non-empty string (UUID or custom ID)
 * - resourceId: optional non-empty string (auto-assigned if not provided)
 * - date: YYYY-MM-DD format
 * - startTime: HH:MM format
 * - endTime: HH:MM format (must be after startTime)
 */
export const createBookingSchema = z.object({
  customerId: z.string().min(1, { message: 'Customer ID is required' }),
  workerId: z.string().min(1, { message: 'Worker ID is required' }),
  serviceId: z.string().min(1, { message: 'Service ID is required' }),
  resourceId: z.string().min(1, { message: 'Resource ID is required' }).optional(),
  date: z.string().regex(dateRegex, { message: 'Date must be in YYYY-MM-DD format' }),
  startTime: z.string().regex(timeRegex, { message: 'Start time must be in HH:MM format' }),
  endTime: z.string().regex(timeRegex, { message: 'End time must be in HH:MM format' }),
}).refine(
  (data) => {
    // Validate that endTime is after startTime
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    return endTotalMinutes > startTotalMinutes;
  },
  { message: 'End time must be after start time', path: ['endTime'] }
);

/**
 * Type inferred from createBookingSchema
 */
export type BookingInput = z.infer<typeof createBookingSchema>;

/**
 * Schema for cancelling a booking.
 */
export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, { message: 'Booking ID is required' }),
  reason: z.string().max(500, { message: 'Reason must be 500 characters or less' }).optional(),
});

/**
 * Type inferred from cancelBookingSchema
 */
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/**
 * Booking status enum values matching Prisma schema
 */
export const BookingStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  NOSHOW: 'NOSHOW',
} as const;

export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];
