/**
 * @jest-environment node
 */

/**
 * Export Service Unit Tests
 */

jest.mock('@/lib/db/client', () => ({
  prisma: {
    customer: { findMany: jest.fn() },
    booking: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/services/reporting.service', () => ({
  getRevenueSummary: jest.fn(),
}));

import { prisma } from '@/lib/db/client';
import { getRevenueSummary } from '@/lib/services/reporting.service';
import {
  generateCSV,
  exportCustomers,
  exportBookings,
  exportRevenue,
} from '@/lib/services/export.service';

describe('Export Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCSV', () => {
    it('produces BOM + header + data lines', () => {
      const csv = generateCSV(['Name', 'Email'], [['Alice', 'a@b.com']]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Name,Email');
      expect(csv).toContain('Alice,a@b.com');
    });

    it('escapes values containing commas', () => {
      const csv = generateCSV(['Col'], [['hello, world']]);
      expect(csv).toContain('"hello, world"');
    });

    it('escapes values containing double quotes', () => {
      const csv = generateCSV(['Col'], [['say "hi"']]);
      expect(csv).toContain('"say ""hi"""');
    });

    it('escapes values containing newlines', () => {
      const csv = generateCSV(['Col'], [['line1\nline2']]);
      expect(csv).toContain('"line1\nline2"');
    });

    it('handles empty rows', () => {
      const csv = generateCSV(['A', 'B'], []);
      expect(csv).toBe('\uFEFFA,B');
    });
  });

  describe('exportCustomers', () => {
    it('returns CSV with customer data', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'c1',
          name: '田中太郎',
          email: 'tanaka@test.com',
          phone: '090-1234-5678',
          assignedStaff: { name: '佐藤' },
          visitCount: 5,
          lastVisitDate: new Date('2026-01-15'),
          createdAt: new Date('2025-06-01'),
          outstandingAmount: 3000,
        },
      ]);

      const csv = await exportCustomers();

      expect(csv).toContain('ID,Name,Email,Phone');
      expect(csv).toContain('田中太郎');
      expect(csv).toContain('tanaka@test.com');
      expect(csv).toContain('佐藤');
      expect(csv).toContain('2026-01-15');
    });

    it('passes search filter to findMany', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([]);

      await exportCustomers({ search: 'tanaka' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'tanaka' }) }),
            ]),
          }),
        })
      );
    });

    it('passes assignedStaffId filter to findMany', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([]);

      await exportCustomers({ assignedStaffId: 'w1' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedStaffId: 'w1' }),
        })
      );
    });

    it('handles null phone and missing staff', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'c2',
          name: 'Test',
          email: 'test@test.com',
          phone: null,
          assignedStaff: null,
          visitCount: 0,
          lastVisitDate: null,
          createdAt: new Date('2025-01-01'),
          outstandingAmount: 0,
        },
      ]);

      const csv = await exportCustomers();

      // Phone and staff columns should be empty, lastVisit empty
      const lines = csv.split('\n');
      const dataLine = lines[1];
      expect(dataLine).toContain('test@test.com');
      // Verify empty columns for null phone and missing staff
      const columns = dataLine.split(',');
      expect(columns[3]).toBe(''); // phone
      expect(columns[4]).toBe(''); // assigned staff
      expect(columns[6]).toBe(''); // lastVisit
    });
  });

  describe('exportBookings', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-02-01');

    it('returns CSV with booking data', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'b1',
          startsAt: new Date('2026-01-15T10:00:00Z'),
          customer: { name: '田中', email: 'tanaka@test.com' },
          service: { name: 'カット', price: 5000 },
          worker: { name: '佐藤' },
          resource: { name: 'ベッド1' },
          status: 'CONFIRMED',
        },
      ]);

      const csv = await exportBookings({ startDate, endDate });

      expect(csv).toContain('Booking ID,Date,Time');
      expect(csv).toContain('b1');
      expect(csv).toContain('2026-01-15');
      expect(csv).toContain('10:00');
      expect(csv).toContain('カット');
      expect(csv).toContain('5000');
    });

    it('queries only CONFIRMED bookings in date range', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValueOnce([]);

      await exportBookings({ startDate, endDate });

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            startsAt: { gte: startDate, lt: endDate },
            status: 'CONFIRMED',
          },
        })
      );
    });
  });

  describe('exportRevenue', () => {
    it('returns CSV with revenue summary data', async () => {
      (getRevenueSummary as jest.Mock).mockResolvedValueOnce([
        {
          period: '2026-01-15T00:00:00.000Z',
          totalRevenue: 50000,
          bookingCount: 10,
          newCustomerCount: 3,
          existingCustomerCount: 7,
        },
      ]);

      const csv = await exportRevenue({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        groupBy: 'day',
      });

      expect(csv).toContain('Period,Total Revenue,Bookings');
      expect(csv).toContain('2026-01-15');
      expect(csv).toContain('50000');
      expect(csv).toContain('10');
      expect(csv).toContain('3');
      expect(csv).toContain('7');
    });

    it('passes params to getRevenueSummary', async () => {
      (getRevenueSummary as jest.Mock).mockResolvedValueOnce([]);

      const params = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        groupBy: 'month' as const,
      };
      await exportRevenue(params);

      expect(getRevenueSummary).toHaveBeenCalledWith(params);
    });
  });
});
