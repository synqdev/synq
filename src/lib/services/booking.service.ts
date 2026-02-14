/**
 * Booking Service
 *
 * Handles booking creation with serializable transactions to prevent race conditions.
 * Implements the double-bottleneck constraint:
 * - A booking requires BOTH a worker AND a resource to be available
 * - Concurrent booking attempts are serialized at the database level
 *
 * Key features:
 * - Serializable transaction isolation for race condition prevention
 * - Retry logic for P2034 (serialization failure) errors
 * - Zod validation before database operations
 * - Auto-assignment of resources when not specified
 * - Sentry error tracking for production monitoring
 */

import { prisma } from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import {
  createBookingSchema,
  cancelBookingSchema,
  type BookingInput,
  type CancelBookingInput,
} from '@/lib/validations/booking';

/**
 * Maximum number of retry attempts for serialization failures
 */
const MAX_RETRIES = 3;

function captureBookingError(error: unknown, context: Record<string, unknown>) {
  Sentry.captureException(error);
  console.error('[booking.service] operation failed', { error, ...context });
}

/**
 * Base delay in milliseconds between retries (multiplied by attempt number)
 */
const RETRY_DELAY_MS = 100;

/**
 * Result type for booking operations
 */
export type BookingResult<T> =
  | { success: true; booking: T }
  | { success: false; error: string };

/**
 * Result type for cancellation operations
 */
export type CancelResult =
  | { success: true }
  | { success: false; error: string };

import { toZonedTime } from '@/lib/utils/time';

/**
 * Converts date string (YYYY-MM-DD) and time string (HH:MM) to a Date object.
 */
function toDateTime(date: string, time: string): Date {
  return toZonedTime(date, time);
}

/**
 * Creates a booking with serializable transaction isolation.
 *
 * This function:
 * 1. Validates input using Zod schema
 * 2. Checks worker availability within the transaction
 * 3. Checks or auto-assigns resource availability
 * 4. Creates the booking atomically
 * 5. Retries on serialization failures (P2034)
 *
 * @param input - Booking input data (validated by Zod)
 * @returns BookingResult with the created booking or error message
 *
 * @example
 * const result = await createBooking({
 *   customerId: 'uuid',
 *   workerId: 'uuid',
 *   serviceId: 'uuid',
 *   date: '2024-06-15',
 *   startTime: '10:00',
 *   endTime: '11:00',
 * });
 *
 * if (result.success) {
 *   console.log('Booking created:', result.booking.id);
 * } else {
 *   console.error('Booking failed:', result.error);
 * }
 */
export async function createBooking(
  input: BookingInput
): Promise<BookingResult<Prisma.BookingGetPayload<object>>> {
  // 1. Validate input with Zod
  const parseResult = createBookingSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  const validated = parseResult.data;

  // Convert date and time strings to Date objects
  const startsAt = toDateTime(validated.date, validated.startTime);
  const endsAt = toDateTime(validated.date, validated.endTime);

  // 2. Attempt booking with retries for serialization failures
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          // Check worker availability within transaction
          const workerConflicts = await tx.booking.findMany({
            where: {
              workerId: validated.workerId,
              status: { in: ['CONFIRMED', 'PENDING'] },
              OR: [
                // Existing booking starts before our end AND ends after our start
                {
                  startsAt: { lt: endsAt },
                  endsAt: { gt: startsAt },
                },
              ],
            },
          });

          if (workerConflicts.length > 0) {
            throw new Error('Worker not available at this time');
          }

          // Find or verify resource availability
          let resourceId = validated.resourceId;

          if (!resourceId) {
            // Auto-assign first available resource
            const availableResource = await findAvailableResource(
              tx,
              startsAt,
              endsAt
            );
            if (!availableResource) {
              throw new Error('No resources available at this time');
            }
            resourceId = availableResource.id;
          } else {
            // Verify specified resource is available
            const resourceConflicts = await tx.booking.findMany({
              where: {
                resourceId,
                status: { in: ['CONFIRMED', 'PENDING'] },
                OR: [
                  {
                    startsAt: { lt: endsAt },
                    endsAt: { gt: startsAt },
                  },
                ],
              },
            });

            if (resourceConflicts.length > 0) {
              throw new Error('Resource not available at this time');
            }
          }

          // Create booking
          return tx.booking.create({
            data: {
              customerId: validated.customerId,
              serviceId: validated.serviceId,
              workerId: validated.workerId,
              resourceId,
              startsAt,
              endsAt,
              status: 'CONFIRMED',
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10000,
        }
      );

      return { success: true, booking };
    } catch (error) {
      // Retry on serialization failure (P2034)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < MAX_RETRIES
      ) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }

      captureBookingError(error, {
        service: 'booking',
        operation: 'createBooking',
        customerId: validated.customerId,
        workerId: validated.workerId,
        serviceId: validated.serviceId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        attempt,
      });

      // Return error for non-retryable errors
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Unknown error occurred' };
    }
  }

  // Should not reach here, but TypeScript needs a return
  /* istanbul ignore next */
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Finds the first available resource for the given time range.
 *
 * @param tx - Prisma transaction client
 * @param startsAt - Booking start time
 * @param endsAt - Booking end time
 * @returns The first available resource, or null if none available
 */
async function findAvailableResource(
  tx: Prisma.TransactionClient,
  startsAt: Date,
  endsAt: Date
): Promise<{ id: string; name: string } | null> {
  // Get all active resources
  const resources = await tx.resource.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }, // Consistent ordering for deterministic assignment
  });

  // Check each resource for conflicts
  for (const resource of resources) {
    const conflicts = await tx.booking.count({
      where: {
        resourceId: resource.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        ],
      },
    });

    if (conflicts === 0) {
      return resource;
    }
  }

  return null;
}

/**
 * Cancels an existing booking.
 *
 * @param input - Cancellation input (bookingId and optional reason)
 * @returns CancelResult indicating success or failure
 *
 * @example
 * const result = await cancelBooking({
 *   bookingId: 'uuid',
 *   reason: 'Customer requested cancellation',
 * });
 */
export async function cancelBooking(
  input: CancelBookingInput
): Promise<CancelResult> {
  // Validate input
  const parseResult = cancelBookingSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  const validated = parseResult.data;

  try {
    // Check if booking exists
    const existing = await prisma.booking.findUnique({
      where: { id: validated.bookingId },
    });

    if (!existing) {
      return { success: false, error: 'Booking not found' };
    }

    // Update status to CANCELLED
    await prisma.booking.update({
      where: { id: validated.bookingId },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  } catch (error) {
    // Capture errors in Sentry
    captureBookingError(error, {
      service: 'booking',
      operation: 'cancelBooking',
      bookingId: validated.bookingId,
    });

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}
