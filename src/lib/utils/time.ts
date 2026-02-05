/**
 * Time utility functions for availability calculations.
 *
 * Pure functions that handle time manipulation without side effects.
 * All time values are strings in HH:MM format (24-hour).
 */

/**
 * Parses a time string (HH:MM) into hours and minutes.
 *
 * @param timeString - Time in HH:MM format (e.g., "09:30")
 * @returns Object with hours and minutes as numbers
 */
export function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Formats hours and minutes into a time string (HH:MM).
 *
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Time string in HH:MM format with leading zeros
 */
export function formatTime(hours: number, minutes: number): string {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Converts a time string to total minutes from midnight.
 * Internal helper for time comparisons.
 *
 * @param timeString - Time in HH:MM format
 * @returns Total minutes from midnight
 */
function toMinutes(timeString: string): number {
  const { hours, minutes } = parseTime(timeString);
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight back to a time string.
 * Internal helper for time calculations.
 *
 * @param totalMinutes - Minutes from midnight
 * @returns Time string in HH:MM format
 */
function fromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return formatTime(hours, minutes);
}

/**
 * Checks if two time ranges overlap.
 *
 * Two ranges overlap if one starts before the other ends AND ends after the other starts.
 * Adjacent ranges (where one ends exactly when another starts) are NOT considered overlapping.
 *
 * @param start1 - Start time of first range (HH:MM)
 * @param end1 - End time of first range (HH:MM)
 * @param start2 - Start time of second range (HH:MM)
 * @param end2 - End time of second range (HH:MM)
 * @returns true if ranges overlap, false otherwise
 *
 * @example
 * // Overlapping ranges
 * isOverlapping('09:00', '11:00', '10:00', '12:00') // true - partial overlap
 * isOverlapping('09:00', '14:00', '10:00', '12:00') // true - first contains second
 *
 * // Non-overlapping ranges
 * isOverlapping('09:00', '10:00', '10:00', '11:00') // false - adjacent, not overlapping
 * isOverlapping('09:00', '10:00', '11:00', '12:00') // false - completely separate
 */
export function isOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // Two ranges overlap if: start1 < end2 AND start2 < end1
  // Using < (not <=) means adjacent ranges don't overlap
  return s1 < e2 && s2 < e1;
}

/**
 * Generates available time slots between start and end times.
 *
 * Only complete slots (where the full duration fits before endTime) are returned.
 * Slots start at startTime and increment by durationMinutes.
 *
 * @param startTime - Start of availability window (HH:MM)
 * @param endTime - End of availability window (HH:MM)
 * @param durationMinutes - Length of each slot in minutes
 * @returns Array of slot start times in HH:MM format
 *
 * @example
 * generateTimeSlots('09:00', '12:00', 60) // ['09:00', '10:00', '11:00']
 * generateTimeSlots('09:00', '10:30', 60) // ['09:00'] - only complete slots
 * generateTimeSlots('09:00', '09:30', 60) // [] - no complete slots fit
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  let currentMinutes = startMinutes;

  // Continue while a complete slot fits within the time window
  while (currentMinutes + durationMinutes <= endMinutes) {
    slots.push(fromMinutes(currentMinutes));
    currentMinutes += durationMinutes;
  }

  return slots;
}
