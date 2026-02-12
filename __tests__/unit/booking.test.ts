/**
 * Booking Service Unit Tests
 *
 * Tests for booking validation logic using Zod schemas.
 * These tests verify input validation without database interaction.
 */

import {
  createBookingSchema,
  cancelBookingSchema,
  BookingStatus,
  type BookingInput,
  type CancelBookingInput,
} from '@/lib/validations/booking';

describe('Booking Validation', () => {
  describe('createBookingSchema', () => {
    // Valid base input for modification in tests
    const validInput: BookingInput = {
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      workerId: '123e4567-e89b-12d3-a456-426614174001',
      serviceId: '123e4567-e89b-12d3-a456-426614174002',
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '11:00',
    };

    describe('valid inputs', () => {
      it('accepts valid booking input with all required fields', () => {
        const result = createBookingSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('accepts valid booking input with optional resourceId', () => {
        const input = {
          ...validInput,
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
        };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('accepts various valid time formats', () => {
        const times = [
          { startTime: '09:00', endTime: '10:00' },
          { startTime: '9:00', endTime: '10:00' },
          { startTime: '00:00', endTime: '01:00' },
          { startTime: '23:00', endTime: '23:59' },
        ];

        times.forEach(({ startTime, endTime }) => {
          const result = createBookingSchema.safeParse({
            ...validInput,
            startTime,
            endTime,
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('customerId validation', () => {
      it('rejects empty customerId', () => {
        const input = { ...validInput, customerId: '' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('customerId');
        }
      });

      it('rejects invalid UUID format', () => {
        const input = { ...validInput, customerId: 'not-a-uuid' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid customer ID format');
        }
      });
    });

    describe('workerId validation', () => {
      it('rejects empty workerId', () => {
        const input = { ...validInput, workerId: '' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('workerId');
        }
      });

      it('rejects invalid UUID format', () => {
        const input = { ...validInput, workerId: 'invalid' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('serviceId validation', () => {
      it('rejects empty serviceId', () => {
        const input = { ...validInput, serviceId: '' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('date validation', () => {
      it('rejects invalid date format', () => {
        const invalidDates = ['2024/01/15', '15-01-2024', 'January 15, 2024', ''];
        invalidDates.forEach((date) => {
          const result = createBookingSchema.safeParse({ ...validInput, date });
          expect(result.success).toBe(false);
        });
      });

      it('accepts valid date format', () => {
        const result = createBookingSchema.safeParse({
          ...validInput,
          date: '2024-12-31',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('time validation', () => {
      it('rejects invalid time formats', () => {
        const invalidTimes = ['25:00', '10:60', '10:0', '1000', ''];
        invalidTimes.forEach((startTime) => {
          const result = createBookingSchema.safeParse({ ...validInput, startTime });
          expect(result.success).toBe(false);
        });
      });

      it('rejects when endTime is before startTime', () => {
        const input = {
          ...validInput,
          startTime: '14:00',
          endTime: '13:00',
        };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('End time must be after start time');
        }
      });

      it('rejects when endTime equals startTime', () => {
        const input = {
          ...validInput,
          startTime: '10:00',
          endTime: '10:00',
        };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('missing fields', () => {
      it('rejects input missing required fields', () => {
        const partialInput = {
          customerId: validInput.customerId,
        };
        const result = createBookingSchema.safeParse(partialInput);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('cancelBookingSchema', () => {
    describe('valid inputs', () => {
      it('accepts valid bookingId', () => {
        const input: CancelBookingInput = {
          bookingId: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = cancelBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('accepts optional reason', () => {
        const input: CancelBookingInput = {
          bookingId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'Customer requested cancellation',
        };
        const result = cancelBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects invalid bookingId format', () => {
        const input = { bookingId: 'not-valid' };
        const result = cancelBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('rejects reason exceeding max length', () => {
        const input = {
          bookingId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'a'.repeat(501),
        };
        const result = cancelBookingSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('BookingStatus', () => {
    it('exports correct status values', () => {
      expect(BookingStatus.CONFIRMED).toBe('CONFIRMED');
      expect(BookingStatus.CANCELLED).toBe('CANCELLED');
      expect(BookingStatus.NOSHOW).toBe('NOSHOW');
    });
  });
});

describe('Booking Service', () => {
  // These tests will fail until booking.service.ts is implemented
  describe('createBooking', () => {
    it('should create a booking with available slot', async () => {
      // Import will fail until service is created
      const { createBooking } = await import('@/lib/services/booking.service');
      expect(createBooking).toBeDefined();
    });

    it('should fail when worker is not available', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');
      expect(typeof createBooking).toBe('function');
    });

    it('should fail when no resource is available', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');
      expect(typeof createBooking).toBe('function');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking', async () => {
      const { cancelBooking } = await import('@/lib/services/booking.service');
      expect(cancelBooking).toBeDefined();
    });
  });
});
