/**
 * @jest-environment node
 */

/**
 * Reporting Service Unit Tests
 */

jest.mock('@/lib/db/client', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/db/client';
import {
  getRevenueSummary,
  getWorkerMetrics,
  getDashboardTotals,
} from '@/lib/services/reporting.service';

describe('Reporting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-02-01');

  describe('getRevenueSummary', () => {
    it('returns empty array when no bookings', async () => {
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([]) // revenue query
        .mockResolvedValueOnce([]) // first booking query
        .mockResolvedValueOnce([]); // unique per period query

      const result = await getRevenueSummary({ startDate, endDate, groupBy: 'day' });

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('returns revenue grouped by day with new/existing customer counts', async () => {
      const period1 = new Date('2026-01-15');
      const period2 = new Date('2026-01-16');

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          { period: period1, total_revenue: BigInt(10000), booking_count: BigInt(2) },
          { period: period2, total_revenue: BigInt(5000), booking_count: BigInt(1) },
        ])
        .mockResolvedValueOnce([
          { period: period1, new_count: BigInt(1) },
        ])
        .mockResolvedValueOnce([
          { period: period1, unique_count: BigInt(2) },
          { period: period2, unique_count: BigInt(1) },
        ]);

      const result = await getRevenueSummary({ startDate, endDate, groupBy: 'day' });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        period: period1.toISOString(),
        totalRevenue: 10000,
        bookingCount: 2,
        newCustomerCount: 1,
        existingCustomerCount: 1,
      });
      expect(result[1]).toEqual({
        period: period2.toISOString(),
        totalRevenue: 5000,
        bookingCount: 1,
        newCustomerCount: 0,
        existingCustomerCount: 1,
      });
    });

    it('handles week and month groupBy values', async () => {
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getRevenueSummary({ startDate, endDate, groupBy: 'week' });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);

      jest.clearAllMocks();

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getRevenueSummary({ startDate, endDate, groupBy: 'month' });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    });
  });

  describe('getWorkerMetrics', () => {
    it('returns empty array when no bookings', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      const result = await getWorkerMetrics({ startDate, endDate });

      expect(result).toEqual([]);
    });

    it('returns worker metrics sorted by revenue desc', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { worker_id: 'w1', worker_name: '田中', total_revenue: BigInt(20000), booking_count: BigInt(4) },
        { worker_id: 'w2', worker_name: '佐藤', total_revenue: BigInt(15000), booking_count: BigInt(3) },
      ]);

      const result = await getWorkerMetrics({ startDate, endDate });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        workerId: 'w1',
        workerName: '田中',
        totalRevenue: 20000,
        bookingCount: 4,
        averagePerBooking: 5000,
      });
      expect(result[1]).toEqual({
        workerId: 'w2',
        workerName: '佐藤',
        totalRevenue: 15000,
        bookingCount: 3,
        averagePerBooking: 5000,
      });
    });

    it('handles zero booking count without division error', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { worker_id: 'w1', worker_name: 'Test', total_revenue: BigInt(0), booking_count: BigInt(0) },
      ]);

      const result = await getWorkerMetrics({ startDate, endDate });

      expect(result[0].averagePerBooking).toBe(0);
    });
  });

  describe('getDashboardTotals', () => {
    it('returns totals for date range', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { total_revenue: BigInt(50000), total_bookings: BigInt(10), unique_customers: BigInt(7) },
      ]);

      const result = await getDashboardTotals({ startDate, endDate });

      expect(result).toEqual({
        totalRevenue: 50000,
        totalBookings: 10,
        uniqueCustomers: 7,
        averageRevenuePerBooking: 5000,
      });
    });

    it('returns zeros when no bookings', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { total_revenue: BigInt(0), total_bookings: BigInt(0), unique_customers: BigInt(0) },
      ]);

      const result = await getDashboardTotals({ startDate, endDate });

      expect(result).toEqual({
        totalRevenue: 0,
        totalBookings: 0,
        uniqueCustomers: 0,
        averageRevenuePerBooking: 0,
      });
    });
  });
});
