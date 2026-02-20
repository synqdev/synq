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

      it('accepts non-UUID customerId values', () => {
        const input = { ...validInput, customerId: 'not-a-uuid' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
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

      it('accepts non-UUID workerId values', () => {
        const input = { ...validInput, workerId: 'invalid' };
        const result = createBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
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
      it('accepts non-UUID bookingId values', () => {
        const input = { bookingId: 'not-valid' };
        const result = cancelBookingSchema.safeParse(input);
        expect(result.success).toBe(true);
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

// Mock Prisma Client
jest.mock('@/lib/db/client', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prismaMock)),
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock @prisma/client to ensure unified class identity for instanceof checks
jest.mock('@prisma/client', () => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    meta?: any;
    constructor(message: string, { code, clientVersion, meta }: any) {
      super(message);
      this.code = code;
      this.clientVersion = clientVersion;
      this.meta = meta;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
      TransactionIsolationLevel: {
        Serializable: 'Serializable'
      }
    }
  };
});

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

import { prisma } from '@/lib/db/client';
import { createBooking, cancelBooking } from '@/lib/services/booking.service';
import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';

// Define the mock transaction client
const prismaMock = {
  booking: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  resource: {
    findMany: jest.fn(),
  },
};

describe('Booking Service', () => {
  const validBookingInput = {
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    workerId: '123e4567-e89b-12d3-a456-426614174001',
    serviceId: '123e4567-e89b-12d3-a456-426614174002',
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default transaction mock implementation
    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prismaMock));
  });

  describe('createBooking', () => {
    it('should create a booking with available slot and auto-assigned resource', async () => {
      // Mock worker availability (no conflicts)
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      // Mock resource availability check
      // First call is findMany (finding all resources)
      prismaMock.resource.findMany.mockResolvedValueOnce([
        { id: 'res-1', name: 'Resource 1', isActive: true },
      ]);
      // Second call is count (checking conflict for res-1) - no conflicts
      prismaMock.booking.count.mockResolvedValueOnce(0);

      // Mock creation
      const createdBooking = { id: 'booking-1', ...validBookingInput, status: 'CONFIRMED' };
      prismaMock.booking.create.mockResolvedValueOnce(createdBooking);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.booking).toEqual(createdBooking);
        expect(prismaMock.booking.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            resourceId: 'res-1',
          }),
        }));
      }
    });

    it('should create a booking with specified resource', async () => {
      const inputWithResource = {
        ...validBookingInput,
        resourceId: '123e4567-e89b-12d3-a456-426614174003', // Valid UUID
      };

      // Mock worker availability (no conflicts)
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      // Mock specified resource availability (checking conflicts directly)
      // Note: Logic calls tx.booking.findMany for resource conflicts when ID is provided
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      const createdBooking = { id: 'booking-2', ...inputWithResource, status: 'CONFIRMED' };
      prismaMock.booking.create.mockResolvedValueOnce(createdBooking);

      const result = await createBooking(inputWithResource);

      expect(result.success).toBe(true);
      expect(prismaMock.booking.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
        }),
      }));
    });

    it('should fail when validation fails', async () => {
      const invalidInput = { ...validBookingInput, startTime: 'invalid' };
      const result = await createBooking(invalidInput as any);
      expect(result.success).toBe(false);
    });

    it('should fail when worker is not available', async () => {
      // Mock worker availability (conflict found)
      prismaMock.booking.findMany.mockResolvedValueOnce([{ id: 'conflict-1' }]);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Worker not available at this time');
      }
      expect(prismaMock.booking.create).not.toHaveBeenCalled();
    });

    it('should fail when specified resource is not available', async () => {
      const inputWithResource = {
        ...validBookingInput,
        resourceId: '123e4567-e89b-12d3-a456-426614174003', // Valid UUID
      };

      // Mock worker availability (no conflicts)
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      // Mock resource availability (conflict found)
      prismaMock.booking.findMany.mockResolvedValueOnce([{ id: 'conflict-res' }]);

      const result = await createBooking(inputWithResource);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Resource not available at this time');
      }
    });

    it('should fail when no auto-assigned resource is available', async () => {
      // Mock worker availability
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      // Mock resource finding
      prismaMock.resource.findMany.mockResolvedValueOnce([
        { id: 'res-1', name: 'Resource 1' },
      ]);
      // Mock conflict for res-1
      prismaMock.booking.count.mockResolvedValueOnce(1);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No resources available at this time');
      }
    });

    it('should return null if no resources exist in DB (auto-assign)', async () => {
      // Mock worker availability
      prismaMock.booking.findMany.mockResolvedValueOnce([]);

      // Mock resource finding - empty list
      prismaMock.resource.findMany.mockResolvedValueOnce([]);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No resources available at this time');
      }
    });

    it('should retry on serialization failure and succeed', async () => {
      // First attempt fails with P2034
      const error = new Prisma.PrismaClientKnownRequestError('Serialization failure', {
        code: 'P2034',
        clientVersion: '5.0.0',
      });

      (prisma.$transaction as jest.Mock)
        .mockRejectedValueOnce(error) // Fail 1st time
        .mockImplementationOnce((cb) => cb(prismaMock)); // Succeed 2nd time

      // Setup success mocks for 2nd attempt
      prismaMock.booking.findMany.mockResolvedValueOnce([]); // Worker ok
      prismaMock.resource.findMany.mockResolvedValueOnce([{ id: 'res-1' }]); // Find res
      prismaMock.booking.count.mockResolvedValueOnce(0); // Res ok
      prismaMock.booking.create.mockResolvedValueOnce({ id: 'booking-retry' });

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Serialization failure', {
        code: 'P2034',
        clientVersion: '5.0.0',
      });

      // Fail all 3 attempts
      (prisma.$transaction as jest.Mock).mockRejectedValue(error);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      // It returns "Unknown error occurred" or caught inside? 
      // Wait, the code loops MAX_RETRIES. After loop finishes, there is a return statement.
      // "return { success: false, error: 'Max retries exceeded' };"
      // But if it fails on the last attempt, it goes to catch block.
      // If attempt < MAX_RETRIES it retries.
      // When attempt === MAX_RETRIES, condition `attempt < MAX_RETRIES` is false.
      // So on the last failure, it falls through to Sentry capture and returns error.
      // But `error` is instanceof Error, so it returns error.message "Serialization failure"
      // Let's verify logic:
      // attempt=1 (fails) -> retry
      // attempt=2 (fails) -> retry
      // attempt=3 (fails) -> attempt < 3 is false. Falls through.

      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('should handle non-retryable errors and report to Sentry', async () => {
      const error = new Error('Database connection failed');
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(error);

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should handle unknown errors', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce('String error');

      const result = await createBooking(validBookingInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unknown error occurred');
      }
    });
  });

  describe('cancelBooking', () => {
    const validCancelInput = { bookingId: '123e4567-e89b-12d3-a456-426614174004' }; // Valid UUID

    it('should cancel a booking successfully', async () => {
      // Mock finding booking
      (prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174004' });
      // Mock update
      (prisma.booking.update as jest.Mock).mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174004', status: 'CANCELLED' });

      const result = await cancelBooking(validCancelInput);

      expect(result.success).toBe(true);
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174004' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should return error when booking with non-UUID id is not found', async () => {
      // cancelBookingSchema accepts any non-empty string (not UUID-only),
      // so 'invalid' passes schema validation but no booking is found in DB.
      (prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const result = await cancelBooking({ bookingId: 'invalid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Booking not found');
      }
    });

    it('should return error if booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await cancelBooking(validCancelInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Booking not found');
      }
    });

    it('should handle errors and report to Sentry', async () => {
      (prisma.booking.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const result = await cancelBooking(validCancelInput);

      expect(result.success).toBe(false);
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should handle unknown errors', async () => {
      (prisma.booking.findUnique as jest.Mock).mockRejectedValueOnce('Unknown');

      const result = await cancelBooking(validCancelInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unknown error occurred');
      }
    });
  });
});
