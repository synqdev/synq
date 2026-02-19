/**
 * Reporting Validation Schema Tests
 */

import { revenueQuerySchema, workerMetricsQuerySchema } from '@/lib/validations/reporting';

describe('Reporting Validations', () => {
  describe('revenueQuerySchema', () => {
    it('parses valid input with defaults', () => {
      const result = revenueQuerySchema.safeParse({
        startDate: '2026-01-01',
        endDate: '2026-02-01',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.groupBy).toBe('day');
        expect(result.data.startDate).toBeInstanceOf(Date);
        expect(result.data.endDate).toBeInstanceOf(Date);
      }
    });

    it('accepts valid groupBy values', () => {
      for (const groupBy of ['day', 'week', 'month'] as const) {
        const result = revenueQuerySchema.safeParse({
          startDate: '2026-01-01',
          endDate: '2026-02-01',
          groupBy,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid groupBy', () => {
      const result = revenueQuerySchema.safeParse({
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        groupBy: 'year',
      });
      expect(result.success).toBe(false);
    });

    it('rejects endDate before startDate', () => {
      const result = revenueQuerySchema.safeParse({
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('rejects date range over 1 year', () => {
      const result = revenueQuerySchema.safeParse({
        startDate: '2025-01-01',
        endDate: '2026-02-01',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing dates', () => {
      const result = revenueQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('workerMetricsQuerySchema', () => {
    it('parses valid input', () => {
      const result = workerMetricsQuerySchema.safeParse({
        startDate: '2026-01-01',
        endDate: '2026-02-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejects endDate before startDate', () => {
      const result = workerMetricsQuerySchema.safeParse({
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing dates', () => {
      const result = workerMetricsQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
