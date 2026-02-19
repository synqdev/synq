/**
 * @jest-environment node
 */

/**
 * Rankings and Retention API Route Tests
 */

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/services/reporting.service', () => ({
  getWorkerRankings: jest.fn(),
  getRepeatCustomerRate: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getWorkerRankings, getRepeatCustomerRate } from '@/lib/services/reporting.service';
import { GET as rankingsGET } from '../../app/api/admin/reports/rankings/route';
import { GET as retentionGET } from '../../app/api/admin/reports/retention/route';

describe('Rankings & Retention API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/reports/rankings', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/reports/rankings?startDate=2026-01-01&endDate=2026-02-01');
      const res = await rankingsGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/rankings');
      const res = await rankingsGET(req);

      expect(res.status).toBe(400);
    });

    it('returns 500 when getWorkerRankings throws', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (getWorkerRankings as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/reports/rankings?startDate=2026-01-01&endDate=2026-02-01');
      const res = await rankingsGET(req);

      expect(res.status).toBe(500);
    });

    it('returns rankings on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      const mockRankings = [
        { rank: 1, workerId: 'w1', workerName: '田中', totalRevenue: 30000, bookingCount: 6, differenceFromFirst: 0 },
        { rank: 2, workerId: 'w2', workerName: '佐藤', totalRevenue: 20000, bookingCount: 4, differenceFromFirst: -10000 },
      ];
      (getWorkerRankings as jest.Mock).mockResolvedValueOnce(mockRankings);

      const req = new NextRequest('http://localhost/api/admin/reports/rankings?startDate=2026-01-01&endDate=2026-02-01');
      const res = await rankingsGET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.rankings).toEqual(mockRankings);
    });
  });

  describe('GET /api/admin/reports/retention', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/reports/retention?startDate=2026-01-01&endDate=2026-02-01');
      const res = await retentionGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/reports/retention');
      const res = await retentionGET(req);

      expect(res.status).toBe(400);
    });

    it('returns 500 when getRepeatCustomerRate throws', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (getRepeatCustomerRate as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/reports/retention?startDate=2026-01-01&endDate=2026-02-01');
      const res = await retentionGET(req);

      expect(res.status).toBe(500);
    });

    it('returns retention data on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      const mockRetention = { totalCustomers: 10, repeatCustomers: 6, repeatRate: 60, newCustomers: 4 };
      (getRepeatCustomerRate as jest.Mock).mockResolvedValueOnce(mockRetention);

      const req = new NextRequest('http://localhost/api/admin/reports/retention?startDate=2026-01-01&endDate=2026-02-01');
      const res = await retentionGET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(mockRetention);
    });
  });
});
