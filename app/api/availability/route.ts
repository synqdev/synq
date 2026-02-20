/**
 * Availability API Route
 *
 * Returns available booking slots for a given date.
 * Used by the booking calendar for live availability polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getAvailableSlots, type Resource } from '@/lib/services/availability.service';
import { toZonedTime } from '@/lib/utils/time';
import { BUSINESS_TIMEZONE } from '@/lib/constants';

/**
 * GET /api/availability?date=YYYY-MM-DD&serviceId=SERVICE_ID
 *
 * Returns workers and their available slots for the specified date and service.
 * Service is required because duration affects slot availability.
 * If no date provided, defaults to today.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const serviceId = searchParams.get('serviceId');

    // Validate serviceId is required
    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    // Parse date string to start and end of day in business timezone
    // toZonedTime('2026-02-06', '00:00') returns 2026-02-06 00:00:00 JST (which is 2026-02-05 15:00:00 UTC)
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
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      );
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
          // Only fetch recurring schedules for this day of week.
          // specificDate overrides are not yet implemented (no write path exists).
          dayOfWeek,
          specificDate: null,
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

    return NextResponse.json({
      date: dateStr,
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: service.duration,
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
