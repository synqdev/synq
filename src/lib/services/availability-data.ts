import { prisma } from '@/lib/db/client';
import { getAvailableSlots, type Resource } from '@/lib/services/availability.service';
import { toZonedTime } from '@/lib/utils/time';
import { BUSINESS_TIMEZONE } from '@/lib/constants';

/**
 * Result from getAvailabilityData.
 */
export interface AvailabilityData {
  date: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  workers: Array<{
    id: string;
    name: string;
    nameEn?: string | null;
    slots: Array<{
      startTime: string;
      endTime: string;
      availableResourceIds: string[];
    }>;
  }>;
}

/**
 * Fetches availability data for a given service and date.
 * Consolidated from API route logic for reuse in Server Components.
 *
 * @param serviceId - ID of the service to check
 * @param dateStr - Date string (YYYY-MM-DD)
 * @returns Availability data or null if service not found
 */
export async function getAvailabilityData(
  serviceId: string,
  dateStr: string = new Date().toISOString().split('T')[0]
): Promise<AvailabilityData | null> {
  // Parse date string to start and end of day in business timezone
  const startOfDay = toZonedTime(dateStr, '00:00');

  // Calculate end of day (start of day + 24 hours)
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Get day of week from the date string explicitly (YYYY-MM-DD parses as UTC)
  const dayOfWeek = new Date(dateStr).getUTCDay();

  // Fetch service to get duration (required for availability calculation)
  const service = await prisma.service.findUnique({
    where: { id: serviceId, isActive: true },
  });

  if (!service) {
    return null;
  }

  const serviceDuration = service.duration;

  // Fetch all required data in parallel
  const [workers, resources, bookings, schedules] = await Promise.all([
    prisma.worker.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.resource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: startOfDay, lt: endOfDay },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
    prisma.workerSchedule.findMany({
      where: {
        isAvailable: true,
        OR: [
          // Recurring schedule for this day of week
          { dayOfWeek, specificDate: null },
          // Specific date schedule (overrides recurring)
          { specificDate: startOfDay },
        ],
      },
    }),
  ]);

  // Convert resources to availability service format
  const resourceList: Resource[] = resources.map((r) => ({
    id: r.id,
    name: r.name,
  }));

  // Helper to format Date to HH:MM in business timezone
  const formatTimeInZone = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      timeZone: BUSINESS_TIMEZONE,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Convert bookings to time slot format (HH:MM)
  const existingBookings = bookings.map((b) => {
    return {
      workerId: b.workerId,
      resourceId: b.resourceId,
      startTime: formatTimeInZone(b.startsAt),
      endTime: formatTimeInZone(b.endsAt),
    };
  });

  // Calculate available slots for each worker
  const workersWithSlots = workers.map((worker) => {
    // Find worker's schedule for this day
    // Specific date overrides recurring schedule
    const specificSchedule = schedules.find(
      (s) => s.workerId === worker.id && s.specificDate !== null
    );
    const recurringSchedule = schedules.find(
      (s) => s.workerId === worker.id && s.dayOfWeek === dayOfWeek && s.specificDate === null
    );
    const workerSchedule = specificSchedule || recurringSchedule;

    // If no schedule found, worker has no available slots
    if (!workerSchedule) {
      return {
        id: worker.id,
        name: worker.name,
        nameEn: worker.nameEn,
        slots: [],
      };
    }

    // Get available slots using availability service
    const slots = getAvailableSlots(
      dateStr,
      worker.id,
      resourceList,
      existingBookings,
      {
        startTime: workerSchedule.startTime,
        endTime: workerSchedule.endTime,
      },
      serviceDuration
    );

    return {
      id: worker.id,
      name: worker.name,
      nameEn: worker.nameEn,
      slots: slots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        availableResourceIds: slot.availableResourceIds,
      })),
    };
  });

  return {
    date: dateStr,
    serviceId: service.id,
    serviceName: service.name,
    serviceDuration: service.duration,
    workers: workersWithSlots,
  };
}
