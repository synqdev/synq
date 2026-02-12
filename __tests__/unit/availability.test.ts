/**
 * Availability service tests
 *
 * Tests for the double-bottleneck constraint:
 * A slot is AVAILABLE if and only if:
 * 1. Worker Check: No existing booking overlaps the time range
 * 2. Resource Check: At least one resource (bed) has no overlapping booking
 */
import {
  checkWorkerAvailability,
  checkResourceAvailability,
  getAvailableSlots,
  type BookingSlot,
  type ScheduleBlock,
  type Resource,
  type AvailableSlot,
} from '@/lib/services/availability.service';

describe('Availability Service', () => {
  describe('checkWorkerAvailability', () => {
    const workerId = 'worker-1';

    describe('when worker has no bookings', () => {
      it('returns true (worker is available)', () => {
        const existingBookings: BookingSlot[] = [];
        expect(
          checkWorkerAvailability(workerId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });

    describe('when worker has non-overlapping bookings', () => {
      it('returns true when booking is before requested time', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '08:00', endTime: '09:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });

      it('returns true when booking is after requested time', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '12:00', endTime: '13:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });

      it('returns true when adjacent booking (end equals start)', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '09:00', endTime: '10:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });

    describe('when worker has overlapping bookings', () => {
      it('returns false when new booking starts during existing', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '09:00', endTime: '11:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '12:00', existingBookings)
        ).toBe(false);
      });

      it('returns false when new booking ends during existing', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '10:00', endTime: '12:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '09:00', '11:00', existingBookings)
        ).toBe(false);
      });

      it('returns false when new booking contains existing entirely', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '09:00', '12:00', existingBookings)
        ).toBe(false);
      });

      it('returns false when existing contains new booking entirely', () => {
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '09:00', endTime: '14:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '12:00', existingBookings)
        ).toBe(false);
      });
    });

    describe('when other workers have overlapping bookings', () => {
      it('returns true (only checks specified worker)', () => {
        const existingBookings: BookingSlot[] = [
          { workerId: 'worker-2', resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
        ];
        expect(
          checkWorkerAvailability(workerId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });
  });

  describe('checkResourceAvailability', () => {
    const resourceId = 'bed-1';

    describe('when resource has no bookings', () => {
      it('returns true (resource is available)', () => {
        const existingBookings: BookingSlot[] = [];
        expect(
          checkResourceAvailability(resourceId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });

    describe('when resource has non-overlapping bookings', () => {
      it('returns true when booking is before requested time', () => {
        const existingBookings: BookingSlot[] = [
          { workerId: 'worker-1', resourceId, startTime: '08:00', endTime: '09:00' },
        ];
        expect(
          checkResourceAvailability(resourceId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });

      it('returns true when booking is after requested time', () => {
        const existingBookings: BookingSlot[] = [
          { workerId: 'worker-1', resourceId, startTime: '12:00', endTime: '13:00' },
        ];
        expect(
          checkResourceAvailability(resourceId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });

    describe('when resource has overlapping bookings', () => {
      it('returns false when new booking overlaps existing', () => {
        const existingBookings: BookingSlot[] = [
          { workerId: 'worker-1', resourceId, startTime: '09:00', endTime: '11:00' },
        ];
        expect(
          checkResourceAvailability(resourceId, '10:00', '12:00', existingBookings)
        ).toBe(false);
      });
    });

    describe('when other resources have overlapping bookings', () => {
      it('returns true (only checks specified resource)', () => {
        const existingBookings: BookingSlot[] = [
          { workerId: 'worker-1', resourceId: 'bed-2', startTime: '10:00', endTime: '11:00' },
        ];
        expect(
          checkResourceAvailability(resourceId, '10:00', '11:00', existingBookings)
        ).toBe(true);
      });
    });
  });

  describe('getAvailableSlots', () => {
    const workerId = 'worker-1';
    const resources: Resource[] = [
      { id: 'bed-1', name: 'Bed 1' },
      { id: 'bed-2', name: 'Bed 2' },
    ];
    const workerSchedule: ScheduleBlock = {
      startTime: '09:00',
      endTime: '17:00',
    };
    const serviceDuration = 60; // minutes

    describe('double-bottleneck constraint', () => {
      it('returns no slots when ALL resources are booked for a time', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [
          // Both beds booked at 10:00-11:00
          { workerId: 'worker-2', resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
          { workerId: 'worker-3', resourceId: 'bed-2', startTime: '10:00', endTime: '11:00' },
        ];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // 10:00 slot should NOT be available (no free beds)
        const tenOClockSlot = slots.find((s) => s.startTime === '10:00');
        expect(tenOClockSlot).toBeUndefined();
      });

      it('returns slots when at least ONE resource is free', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [
          // Only bed-1 booked at 10:00-11:00, bed-2 is free
          { workerId: 'worker-2', resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
        ];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // 10:00 slot SHOULD be available (bed-2 is free)
        const tenOClockSlot = slots.find((s) => s.startTime === '10:00');
        expect(tenOClockSlot).toBeDefined();
        expect(tenOClockSlot?.availableResourceIds).toContain('bed-2');
        expect(tenOClockSlot?.availableResourceIds).not.toContain('bed-1');
      });

      it('returns no slots when worker has overlapping booking', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [
          // This worker already has a booking at 10:00-11:00
          { workerId, resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
        ];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // 10:00 slot should NOT be available (worker is busy)
        const tenOClockSlot = slots.find((s) => s.startTime === '10:00');
        expect(tenOClockSlot).toBeUndefined();
      });

      it('returns slots only within worker schedule', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [];
        const limitedSchedule: ScheduleBlock = {
          startTime: '10:00',
          endTime: '12:00',
        };

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          limitedSchedule,
          serviceDuration
        );

        // Should only have slots at 10:00 and 11:00
        expect(slots.length).toBe(2);
        expect(slots.map((s) => s.startTime)).toEqual(['10:00', '11:00']);
      });
    });

    describe('slot generation', () => {
      it('includes date in returned slots', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        expect(slots[0].date).toBe(date);
      });

      it('includes all available resource IDs in each slot', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // With no bookings, all resources should be available for each slot
        expect(slots[0].availableResourceIds).toContain('bed-1');
        expect(slots[0].availableResourceIds).toContain('bed-2');
      });

      it('calculates correct end time based on duration', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // 09:00 start + 60 min = 10:00 end
        expect(slots[0].startTime).toBe('09:00');
        expect(slots[0].endTime).toBe('10:00');
      });
    });

    describe('edge cases', () => {
      it('returns empty array when no resources provided', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [];

        const slots = getAvailableSlots(
          date,
          workerId,
          [], // No resources
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        expect(slots).toEqual([]);
      });

      it('handles multiple bookings for same worker correctly', () => {
        const date = '2024-01-15';
        const existingBookings: BookingSlot[] = [
          { workerId, resourceId: 'bed-1', startTime: '10:00', endTime: '11:00' },
          { workerId, resourceId: 'bed-2', startTime: '14:00', endTime: '15:00' },
        ];

        const slots = getAvailableSlots(
          date,
          workerId,
          resources,
          existingBookings,
          workerSchedule,
          serviceDuration
        );

        // 10:00 and 14:00 slots should be excluded
        const slotTimes = slots.map((s) => s.startTime);
        expect(slotTimes).not.toContain('10:00');
        expect(slotTimes).not.toContain('14:00');
        expect(slotTimes).toContain('09:00');
        expect(slotTimes).toContain('11:00');
      });
    });
  });
});
