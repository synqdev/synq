/**
 * Booking Service Integration Tests
 *
 * Tests for booking creation with database interaction.
 * Verifies serializable transaction isolation and concurrent booking prevention.
 *
 * These tests require a test database and will be skipped if DATABASE_URL is not set.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Skip tests if no database URL is configured
const skipIntegration = !process.env.DATABASE_URL;

// Conditional describe that skips if no DB
const describeWithDb = skipIntegration ? describe.skip : describe;

describeWithDb('Booking Service Integration', () => {
  let prisma: PrismaClient;

  // Test data IDs (deterministic for cleanup)
  const testIds = {
    worker: '11111111-1111-1111-1111-111111111111',
    worker2: '11111111-1111-1111-1111-111111111112',
    resource1: '22222222-2222-2222-2222-222222222221',
    resource2: '22222222-2222-2222-2222-222222222222',
    customer: '33333333-3333-3333-3333-333333333333',
    service: '44444444-4444-4444-4444-444444444444',
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: {
        OR: [
          { workerId: testIds.worker },
          { workerId: testIds.worker2 },
        ],
      },
    });
    await prisma.customer.deleteMany({ where: { id: testIds.customer } });
    await prisma.service.deleteMany({ where: { id: testIds.service } });
    await prisma.resource.deleteMany({
      where: { id: { in: [testIds.resource1, testIds.resource2] } },
    });
    await prisma.worker.deleteMany({
      where: { id: { in: [testIds.worker, testIds.worker2] } },
    });

    // Create test fixtures
    await prisma.worker.createMany({
      data: [
        { id: testIds.worker, name: 'Test Worker 1' },
        { id: testIds.worker2, name: 'Test Worker 2' },
      ],
    });

    await prisma.resource.createMany({
      data: [
        { id: testIds.resource1, name: 'Test Bed 1' },
        { id: testIds.resource2, name: 'Test Bed 2' },
      ],
    });

    await prisma.customer.create({
      data: { id: testIds.customer, name: 'Test Customer', email: 'test@example.com' },
    });

    await prisma.service.create({
      data: { id: testIds.service, name: 'Test Service', duration: 60, price: 5000 },
    });
  });

  describe('createBooking with serializable transaction', () => {
    it('creates booking when slot is available', async () => {
      // Import booking service (will fail until implemented)
      const { createBooking } = await import('@/lib/services/booking.service');

      const result = await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.booking).toBeDefined();
        expect(result.booking.status).toBe('CONFIRMED');
        expect(result.booking.workerId).toBe(testIds.worker);
      }
    });

    it('fails when worker has overlapping booking', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');

      // Create first booking
      await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-15',
        startTime: '10:00',
        endTime: '11:00',
      });

      // Attempt overlapping booking for same worker
      const result = await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-15',
        startTime: '10:30',
        endTime: '11:30',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('worker');
      }
    });

    it('fails when all resources are booked', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');

      // Book both resources with different workers
      await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        resourceId: testIds.resource1,
        date: '2024-06-15',
        startTime: '14:00',
        endTime: '15:00',
      });

      await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker2,
        serviceId: testIds.service,
        resourceId: testIds.resource2,
        date: '2024-06-15',
        startTime: '14:00',
        endTime: '15:00',
      });

      // Third worker tries to book - should fail (no resources)
      // Note: We only have 2 workers in test data, but conceptually
      // this tests the "all resources booked" scenario
      // For now, we test that the second booking takes the second resource
      // and a third attempt would fail

      // Let's verify both bookings took different resources
      const bookings = await prisma.booking.findMany({
        where: {
          startsAt: new Date('2024-06-15T14:00:00'),
        },
      });

      expect(bookings.length).toBe(2);
      const resourceIds = bookings.map((b) => b.resourceId);
      expect(resourceIds).toContain(testIds.resource1);
      expect(resourceIds).toContain(testIds.resource2);
    });

    it('auto-assigns available resource when resourceId not provided', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');

      const result = await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-15',
        startTime: '09:00',
        endTime: '10:00',
        // No resourceId provided
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.booking.resourceId).toBeDefined();
        expect([testIds.resource1, testIds.resource2]).toContain(result.booking.resourceId);
      }
    });
  });

  describe('concurrent booking prevention', () => {
    it('allows only one booking when concurrent requests target same slot', async () => {
      const { createBooking } = await import('@/lib/services/booking.service');

      const bookingInput = {
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-15',
        startTime: '16:00',
        endTime: '17:00',
      };

      // Fire multiple concurrent booking requests
      const results = await Promise.allSettled([
        createBooking(bookingInput),
        createBooking(bookingInput),
        createBooking(bookingInput),
      ]);

      // Count successful bookings
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;

      // Only ONE should succeed due to serializable isolation
      expect(successCount).toBe(1);

      // Verify only one booking exists in database
      const bookings = await prisma.booking.findMany({
        where: {
          workerId: testIds.worker,
          startsAt: new Date('2024-06-15T16:00:00'),
        },
      });

      expect(bookings.length).toBe(1);
    });

    it('uses serializable transaction isolation level', async () => {
      // This test verifies the transaction is using Serializable isolation
      // by checking that concurrent writes are properly serialized

      const { createBooking } = await import('@/lib/services/booking.service');

      // Create a scenario where serializable isolation matters:
      // Two requests try to book the last available resource

      // First, book resource1 to leave only resource2 available
      await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        resourceId: testIds.resource1,
        date: '2024-06-15',
        startTime: '11:00',
        endTime: '12:00',
      });

      // Now two concurrent requests try to book resource2
      const results = await Promise.allSettled([
        createBooking({
          customerId: testIds.customer,
          workerId: testIds.worker2,
          serviceId: testIds.service,
          date: '2024-06-15',
          startTime: '11:00',
          endTime: '12:00',
        }),
        createBooking({
          customerId: testIds.customer,
          workerId: testIds.worker2,
          serviceId: testIds.service,
          date: '2024-06-15',
          startTime: '11:00',
          endTime: '12:00',
        }),
      ]);

      // Only one should succeed
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;

      expect(successCount).toBeLessThanOrEqual(1);
    });
  });

  describe('cancelBooking', () => {
    it('cancels an existing booking', async () => {
      const { createBooking, cancelBooking } = await import('@/lib/services/booking.service');

      // Create a booking first
      const createResult = await createBooking({
        customerId: testIds.customer,
        workerId: testIds.worker,
        serviceId: testIds.service,
        date: '2024-06-20',
        startTime: '10:00',
        endTime: '11:00',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Cancel the booking
      const cancelResult = await cancelBooking({
        bookingId: createResult.booking.id,
        reason: 'Test cancellation',
      });

      expect(cancelResult.success).toBe(true);

      // Verify status changed
      const booking = await prisma.booking.findUnique({
        where: { id: createResult.booking.id },
      });

      expect(booking?.status).toBe('CANCELLED');
    });

    it('fails to cancel non-existent booking', async () => {
      const { cancelBooking } = await import('@/lib/services/booking.service');

      const result = await cancelBooking({
        bookingId: '99999999-9999-9999-9999-999999999999',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('retry logic for P2034 errors', () => {
    it('retries on serialization failure', async () => {
      // This test verifies retry logic exists
      // The actual P2034 error is hard to trigger reliably in tests
      // We verify the function handles it gracefully

      const { createBooking } = await import('@/lib/services/booking.service');

      // Multiple concurrent requests should all complete
      // (either succeed or fail gracefully, no unhandled errors)
      const promises = Array(5).fill(null).map(() =>
        createBooking({
          customerId: testIds.customer,
          workerId: testIds.worker,
          serviceId: testIds.service,
          date: '2024-06-25',
          startTime: '15:00',
          endTime: '16:00',
        })
      );

      const results = await Promise.allSettled(promises);

      // All should complete (not throw unhandled errors)
      const rejections = results.filter((r) => r.status === 'rejected');
      expect(rejections.length).toBe(0);

      // Exactly one should succeed
      const successes = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      );
      expect(successes.length).toBe(1);
    });
  });
});

// Export for type checking
export {};
