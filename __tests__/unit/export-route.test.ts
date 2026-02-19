/**
 * @jest-environment node
 */

/**
 * Export API Route Tests
 */

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/services/export.service', () => ({
  exportCustomers: jest.fn(),
  exportBookings: jest.fn(),
  exportRevenue: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  exportCustomers,
  exportBookings,
  exportRevenue,
} from '@/lib/services/export.service';
import { GET as customersGET } from '../../app/api/admin/export/customers/route';
import { GET as bookingsGET } from '../../app/api/admin/export/bookings/route';
import { GET as revenueGET } from '../../app/api/admin/export/revenue/route';

describe('Export API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/export/customers', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/export/customers');
      const res = await customersGET(req);

      expect(res.status).toBe(401);
    });

    it('returns CSV with correct headers', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportCustomers as jest.Mock).mockResolvedValueOnce('\uFEFFID,Name\nc1,Test');

      const req = new NextRequest('http://localhost/api/admin/export/customers');
      const res = await customersGET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(res.headers.get('Content-Disposition')).toContain('customers_');
      expect(res.headers.get('Content-Disposition')).toContain('.csv');
    });

    it('passes search and assignedStaffId params', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportCustomers as jest.Mock).mockResolvedValueOnce('csv');

      const req = new NextRequest('http://localhost/api/admin/export/customers?search=tanaka&assignedStaffId=w1');
      await customersGET(req);

      expect(exportCustomers).toHaveBeenCalledWith({
        search: 'tanaka',
        assignedStaffId: 'w1',
      });
    });

    it('returns 500 on service error', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportCustomers as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/export/customers');
      const res = await customersGET(req);

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/admin/export/bookings', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/export/bookings?startDate=2026-01-01&endDate=2026-02-01');
      const res = await bookingsGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/export/bookings');
      const res = await bookingsGET(req);

      expect(res.status).toBe(400);
    });

    it('returns CSV on valid request', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportBookings as jest.Mock).mockResolvedValueOnce('\uFEFFBooking ID\nb1');

      const req = new NextRequest('http://localhost/api/admin/export/bookings?startDate=2026-01-01&endDate=2026-02-01');
      const res = await bookingsGET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(exportBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('GET /api/admin/export/revenue', () => {
    it('returns 401 when not admin', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

      const req = new NextRequest('http://localhost/api/admin/export/revenue?startDate=2026-01-01&endDate=2026-02-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid dates', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost/api/admin/export/revenue?startDate=2026-02-01&endDate=2026-01-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(400);
    });

    it('returns CSV on valid request with default groupBy', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportRevenue as jest.Mock).mockResolvedValueOnce('\uFEFFPeriod\n2026-01-15');

      const req = new NextRequest('http://localhost/api/admin/export/revenue?startDate=2026-01-01&endDate=2026-02-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain('revenue_');
      expect(exportRevenue).toHaveBeenCalledWith(
        expect.objectContaining({
          groupBy: 'day',
        })
      );
    });

    it('returns 500 on service error', async () => {
      (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
      (exportRevenue as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const req = new NextRequest('http://localhost/api/admin/export/revenue?startDate=2026-01-01&endDate=2026-02-01');
      const res = await revenueGET(req);

      expect(res.status).toBe(500);
    });
  });
});
