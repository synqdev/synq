/**
 * @jest-environment node
 */

/**
 * Worker Rankings and Retention Service Tests
 */

jest.mock('@/lib/db/client', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/db/client';
import {
  getWorkerRankings,
  getRepeatCustomerRate,
} from '@/lib/services/reporting.service';

describe('Rankings & Retention Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-02-01');

  describe('getWorkerRankings', () => {
    it('returns empty array when no workers', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      const result = await getWorkerRankings({ startDate, endDate });
      expect(result).toEqual([]);
    });

    it('returns ranked workers with differenceFromFirst', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { worker_id: 'w1', worker_name: '田中', total_revenue: BigInt(30000), booking_count: BigInt(6) },
        { worker_id: 'w2', worker_name: '佐藤', total_revenue: BigInt(20000), booking_count: BigInt(4) },
        { worker_id: 'w3', worker_name: '鈴木', total_revenue: BigInt(10000), booking_count: BigInt(2) },
      ]);

      const result = await getWorkerRankings({ startDate, endDate });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({
        rank: 1,
        workerName: '田中',
        totalRevenue: 30000,
        differenceFromFirst: 0,
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        rank: 2,
        workerName: '佐藤',
        totalRevenue: 20000,
        differenceFromFirst: -10000,
      }));
      expect(result[2]).toEqual(expect.objectContaining({
        rank: 3,
        workerName: '鈴木',
        totalRevenue: 10000,
        differenceFromFirst: -20000,
      }));
    });

    it('single worker has rank 1 with zero difference', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { worker_id: 'w1', worker_name: 'Solo', total_revenue: BigInt(5000), booking_count: BigInt(1) },
      ]);

      const result = await getWorkerRankings({ startDate, endDate });

      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
      expect(result[0].differenceFromFirst).toBe(0);
    });
  });

  describe('getRepeatCustomerRate', () => {
    it('returns zeros when no customers', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

      const result = await getRepeatCustomerRate({ startDate, endDate });

      expect(result).toEqual({
        totalCustomers: 0,
        repeatCustomers: 0,
        repeatRate: 0,
        newCustomers: 0,
      });
    });

    it('calculates repeat rate correctly', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { customer_id: 'c1', has_prior: true },
        { customer_id: 'c2', has_prior: true },
        { customer_id: 'c3', has_prior: false },
      ]);

      const result = await getRepeatCustomerRate({ startDate, endDate });

      expect(result).toEqual({
        totalCustomers: 3,
        repeatCustomers: 2,
        repeatRate: 66.7,
        newCustomers: 1,
      });
    });

    it('handles all new customers', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { customer_id: 'c1', has_prior: false },
        { customer_id: 'c2', has_prior: false },
      ]);

      const result = await getRepeatCustomerRate({ startDate, endDate });

      expect(result.repeatRate).toBe(0);
      expect(result.newCustomers).toBe(2);
      expect(result.repeatCustomers).toBe(0);
    });

    it('handles all repeat customers', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([
        { customer_id: 'c1', has_prior: true },
        { customer_id: 'c2', has_prior: true },
      ]);

      const result = await getRepeatCustomerRate({ startDate, endDate });

      expect(result.repeatRate).toBe(100);
      expect(result.repeatCustomers).toBe(2);
      expect(result.newCustomers).toBe(0);
    });
  });
});
