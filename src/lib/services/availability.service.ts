/**
 * Availability Service
 *
 * Pure functions for calculating booking availability based on the double-bottleneck constraint:
 * A slot is AVAILABLE if and only if:
 * 1. Worker Check: No existing booking for that worker overlaps the time range
 * 2. Resource Check: At least one resource (bed) has no overlapping booking
 *
 * These functions are intentionally isolated from the database layer for:
 * - Testability: Pure functions with no side effects
 * - Performance: Can be used for both real-time availability and bulk calculations
 * - Correctness: Business logic is separated from data access
 */

import { isOverlapping, generateTimeSlots, formatTime, parseTime } from '@/lib/utils/time';

/**
 * Represents an existing booking that occupies a worker and resource.
 */
export interface BookingSlot {
  workerId: string;
  resourceId: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

/**
 * Represents a worker's schedule block (their working hours).
 */
export interface ScheduleBlock {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

/**
 * Represents a bookable resource (e.g., a bed).
 */
export interface Resource {
  id: string;
  name: string;
}

/**
 * Represents an available time slot with its bookable resources.
 */
export interface AvailableSlot {
  date: string;                   // YYYY-MM-DD format
  startTime: string;              // HH:MM format
  endTime: string;                // HH:MM format
  duration: number;               // Duration in minutes (for frontend cell rendering)
  availableResourceIds: string[]; // Resources that can be booked for this slot
}

/**
 * Checks if a worker is available for a given time range.
 *
 * A worker is available if they have no existing bookings that overlap
 * with the requested time range. Only bookings for the specified worker
 * are considered.
 *
 * @param workerId - ID of the worker to check
 * @param startTime - Requested start time (HH:MM)
 * @param endTime - Requested end time (HH:MM)
 * @param existingBookings - All existing bookings to check against
 * @returns true if worker is available, false if they have an overlapping booking
 *
 * @example
 * // Worker with no bookings is available
 * checkWorkerAvailability('worker-1', '10:00', '11:00', []) // true
 *
 * // Worker with overlapping booking is not available
 * checkWorkerAvailability('worker-1', '10:00', '11:00', [
 *   { workerId: 'worker-1', resourceId: 'bed-1', startTime: '09:30', endTime: '10:30' }
 * ]) // false
 */
export function checkWorkerAvailability(
  workerId: string,
  startTime: string,
  endTime: string,
  existingBookings: BookingSlot[]
): boolean {
  // Filter to only this worker's bookings
  const workerBookings = existingBookings.filter(
    (booking) => booking.workerId === workerId
  );

  // Check if any of the worker's bookings overlap with the requested time
  const hasOverlap = workerBookings.some((booking) =>
    isOverlapping(startTime, endTime, booking.startTime, booking.endTime)
  );

  // Worker is available if there's no overlap
  return !hasOverlap;
}

/**
 * Checks if a resource is available for a given time range.
 *
 * A resource is available if it has no existing bookings that overlap
 * with the requested time range. Only bookings for the specified resource
 * are considered.
 *
 * @param resourceId - ID of the resource to check
 * @param startTime - Requested start time (HH:MM)
 * @param endTime - Requested end time (HH:MM)
 * @param existingBookings - All existing bookings to check against
 * @returns true if resource is available, false if it has an overlapping booking
 *
 * @example
 * // Resource with no bookings is available
 * checkResourceAvailability('bed-1', '10:00', '11:00', []) // true
 *
 * // Resource with overlapping booking is not available
 * checkResourceAvailability('bed-1', '10:00', '11:00', [
 *   { workerId: 'worker-1', resourceId: 'bed-1', startTime: '09:30', endTime: '10:30' }
 * ]) // false
 */
export function checkResourceAvailability(
  resourceId: string,
  startTime: string,
  endTime: string,
  existingBookings: BookingSlot[]
): boolean {
  // Filter to only this resource's bookings
  const resourceBookings = existingBookings.filter(
    (booking) => booking.resourceId === resourceId
  );

  // Check if any of the resource's bookings overlap with the requested time
  const hasOverlap = resourceBookings.some((booking) =>
    isOverlapping(startTime, endTime, booking.startTime, booking.endTime)
  );

  // Resource is available if there's no overlap
  return !hasOverlap;
}

/**
 * Calculates the end time for a slot given start time and duration.
 *
 * @param startTime - Start time (HH:MM)
 * @param durationMinutes - Duration in minutes
 * @returns End time (HH:MM)
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const { hours, minutes } = parseTime(startTime);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return formatTime(endHours, endMinutes);
}

/**
 * Gets all available booking slots for a worker on a given date.
 *
 * This implements the double-bottleneck constraint:
 * - A slot is only available if the WORKER is free (no overlapping bookings)
 * - AND at least ONE resource is free (not all resources are booked)
 *
 * The function generates time slots based on the worker's schedule and service duration,
 * then filters out slots where either constraint is violated.
 *
 * @param date - Date to check availability (YYYY-MM-DD)
 * @param workerId - ID of the worker
 * @param resources - List of all bookable resources
 * @param existingBookings - All existing bookings for the date
 * @param workerSchedule - Worker's schedule block (working hours)
 * @param serviceDuration - Service duration in minutes
 * @returns Array of available slots with their bookable resources
 *
 * @example
 * getAvailableSlots(
 *   '2024-01-15',
 *   'worker-1',
 *   [{ id: 'bed-1', name: 'Bed 1' }, { id: 'bed-2', name: 'Bed 2' }],
 *   [], // no existing bookings
 *   { startTime: '09:00', endTime: '17:00' },
 *   60
 * )
 * // Returns slots from 09:00 to 16:00, each with both beds available
 */
export function getAvailableSlots(
  date: string,
  workerId: string,
  resources: Resource[],
  existingBookings: BookingSlot[],
  workerSchedule: ScheduleBlock,
  serviceDuration: number
): AvailableSlot[] {
  // No resources means no slots possible
  if (resources.length === 0) {
    return [];
  }

  // Generate all possible time slots based on worker's schedule
  const timeSlots = generateTimeSlots(
    workerSchedule.startTime,
    workerSchedule.endTime,
    serviceDuration
  );

  const availableSlots: AvailableSlot[] = [];

  for (const slotStartTime of timeSlots) {
    const slotEndTime = calculateEndTime(slotStartTime, serviceDuration);

    // CONSTRAINT 1: Check if worker is available for this slot
    const workerAvailable = checkWorkerAvailability(
      workerId,
      slotStartTime,
      slotEndTime,
      existingBookings
    );

    if (!workerAvailable) {
      // Worker is busy, skip this slot entirely
      continue;
    }

    // CONSTRAINT 2: Find which resources are available for this slot
    const availableResourceIds = resources
      .filter((resource) =>
        checkResourceAvailability(
          resource.id,
          slotStartTime,
          slotEndTime,
          existingBookings
        )
      )
      .map((resource) => resource.id);

    // Only include slot if at least one resource is available
    if (availableResourceIds.length > 0) {
      availableSlots.push({
        date,
        startTime: slotStartTime,
        endTime: slotEndTime,
        duration: serviceDuration,
        availableResourceIds,
      });
    }
  }

  return availableSlots;
}
