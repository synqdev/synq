/**
 * @jest-environment node
 */

/**
 * Reports API Route Tests
 */

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/services/reporting.service', () => ({
  getRevenueSummary: jest.fn(),
  getDashboardTotals: jest.fn(),
  getWorkerMetrics: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  getRevenueSummary,
  getDashboardTotals,
  getWorkerMetrics,
} from '@/lib/services/reporting.service';
import { GET as revenueGET } from '../../app/api/admin/reports/revenue/route';
import { GET as workersGET } from '../../app/api/admin/reports/workers/route';

describe('Reports API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/reports/revenue', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/reports/revenue?startDate=2026-01-01&endDate=2026-02-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/revenue');
      const res = await revenueGET(req);

      expect(res.status).toBe(400);
    });

    it('returns 400 when endDate before startDate', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/revenue?startDate=2026-02-01&endDate=2026-01-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(400);
    });

    it('returns revenue data on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      const mockSummary = [{ period: '2026-01-15', totalRevenue: 10000, bookingCount: 2 }];
      const mockTotals = { totalRevenue: 10000, totalBookings: 2, uniqueCustomers: 1, averageRevenuePerBooking: 5000 };
      (getRevenueSummary as jest.Mock).mockResolvedValueOnce(mockSummary);
      (getDashboardTotals as jest.Mock).mockResolvedValueOnce(mockTotals);

      const req = new NextRequest('http://localhost/api/admin/reports/revenue?startDate=2026-01-01&endDate=2026-02-01&groupBy=day');
      const res = await revenueGET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.summary).toEqual(mockSummary);
      expect(body.totals).toEqual(mockTotals);
    });

    it('defaults groupBy to day', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (getRevenueSummary as jest.Mock).mockResolvedValueOnce([]);
      (getDashboardTotals as jest.Mock).mockResolvedValueOnce({ totalRevenue: 0, totalBookings: 0, uniqueCustomers: 0, averageRevenuePerBooking: 0 });

      const req = new NextRequest('http://localhost/api/admin/reports/revenue?startDate=2026-01-01&endDate=2026-02-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(200);
      expect(getRevenueSummary).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: 'day' })
      );
    });
  });

  describe('GET /api/admin/reports/workers', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/reports/workers?startDate=2026-01-01&endDate=2026-02-01');
      const res = await workersGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/workers');
      const res = await workersGET(req);

      expect(res.status).toBe(400);
    });

    it('returns 400 when endDate before startDate', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/workers?startDate=2026-02-01&endDate=2026-01-01');
      const res = await workersGET(req);

      expect(res.status).toBe(400);
    });

    it('returns 500 when getWorkerMetrics throws', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (getWorkerMetrics as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/reports/workers?startDate=2026-01-01&endDate=2026-02-01');
      const res = await workersGET(req);

      expect(res.status).toBe(500);
    });

    it('returns worker metrics on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      const mockWorkers = [
        { workerId: 'w1', workerName: '田中', totalRevenue: 20000, bookingCount: 4, averagePerBooking: 5000 },
      ];
      (getWorkerMetrics as jest.Mock).mockResolvedValueOnce(mockWorkers);

      const req = new NextRequest('http://localhost/api/admin/reports/workers?startDate=2026-01-01&endDate=2026-02-01');
      const res = await workersGET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.workers).toEqual(mockWorkers);
    });
  });
});
