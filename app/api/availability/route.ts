/**
 * Availability API Route
 *
 * Returns available booking slots for a given date.
 * Used by the booking calendar for live availability polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAvailableSlots, type Resource } from '@/lib/services/availability.service';

/**
 * GET /api/availability?date=YYYY-MM-DD
 *
 * Returns workers and their available slots for the specified date.
 * If no date provided, defaults to today.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Parse date string to start and end of day
    const date = new Date(dateStr + 'T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get day of week for schedule lookup (0=Sunday, 6=Saturday)
    const dayOfWeek = date.getDay();

    // Fetch all required data in parallel
    const [workers, resources, bookings, service, schedules] = await Promise.all([
      prisma.worker.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.resource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.booking.findMany({
        where: {
          startsAt: { gte: startOfDay, lt: endOfDay },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      prisma.service.findFirst({ where: { isActive: true } }),
      prisma.workerSchedule.findMany({
        where: {
          isAvailable: true,
          OR: [
            // Recurring schedule for this day of week
            { dayOfWeek, specificDate: null },
            // Specific date schedule (overrides recurring)
            { specificDate: date },
          ],
        },
      }),
    ]);

    // Default service duration to 60 minutes if no service found
    const serviceDuration = service?.duration || 60;

    // Convert resources to availability service format
    const resourceList: Resource[] = resources.map((r) => ({
      id: r.id,
      name: r.name,
    }));

    // Convert bookings to time slot format (HH:MM)
    const existingBookings = bookings.map((b) => {
      const startHours = b.startsAt.getHours().toString().padStart(2, '0');
      const startMins = b.startsAt.getMinutes().toString().padStart(2, '0');
      const endHours = b.endsAt.getHours().toString().padStart(2, '0');
      const endMins = b.endsAt.getMinutes().toString().padStart(2, '0');
      return {
        workerId: b.workerId,
        resourceId: b.resourceId,
        startTime: `${startHours}:${startMins}`,
        endTime: `${endHours}:${endMins}`,
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

    return NextResponse.json({
      date: dateStr,
      serviceDuration,
      workers: workersWithSlots,
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
