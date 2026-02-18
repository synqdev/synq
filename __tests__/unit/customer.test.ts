/**
 * Customer Validation & Service Unit Tests
 *
 * Tests for:
 * - registerCustomerSchema (Zod validation, no mocks)
 * - customerListQuerySchema (Zod validation, no mocks)
 * - findOrCreateCustomer (prisma upsert)
 * - findCustomerById (prisma findUnique)
 * - getCustomerList (search, filter, sort, pagination, computed metrics)
 */

import {
  registerCustomerSchema,
  customerListQuerySchema,
} from '@/lib/validations/customer';

// ---------------------------------------------------------------------------
// Validation Tests (pure Zod, no mocks)
// ---------------------------------------------------------------------------

describe('Customer Validation', () => {
  describe('registerCustomerSchema', () => {
    const validInput = {
      email: 'tanaka@example.com',
      name: '田中太郎',
      phone: '090-1234-5678',
      locale: 'ja' as const,
    };

    describe('valid inputs', () => {
      it('accepts valid input with all fields', () => {
        const result = registerCustomerSchema.safeParse(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it('accepts valid input without phone', () => {
        const { phone, ...withoutPhone } = validInput;
        const result = registerCustomerSchema.safeParse(withoutPhone);
        expect(result.success).toBe(true);
      });

      it('defaults locale to ja when omitted', () => {
        const input = { email: 'test@example.com', name: 'Test' };
        const result = registerCustomerSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.locale).toBe('ja');
        }
      });

      it('accepts empty phone string via .or(z.literal(""))', () => {
        const input = { ...validInput, phone: '' };
        const result = registerCustomerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('rejects missing email', () => {
        const { email, ...noEmail } = validInput;
        const result = registerCustomerSchema.safeParse(noEmail);
        expect(result.success).toBe(false);
      });

      it('rejects missing name', () => {
        const { name, ...noName } = validInput;
        const result = registerCustomerSchema.safeParse(noName);
        expect(result.success).toBe(false);
      });

      it('rejects invalid email', () => {
        const result = registerCustomerSchema.safeParse({ ...validInput, email: 'not-email' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid email address');
        }
      });

      it('rejects name longer than 100 characters', () => {
        const result = registerCustomerSchema.safeParse({
          ...validInput,
          name: 'a'.repeat(101),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be 100 characters or less');
        }
      });
    });
  });

  describe('customerListQuerySchema', () => {
    it('provides defaults when given empty object', () => {
      const result = customerListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(25);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('accepts valid sort options', () => {
      const sortByOptions = ['name', 'visitCount', 'lastVisitDate', 'createdAt'] as const;
      for (const sortBy of sortByOptions) {
        const result = customerListQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid sortBy value', () => {
      const result = customerListQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('coerces string page and pageSize to numbers', () => {
      const result = customerListQuerySchema.safeParse({
        page: '3',
        pageSize: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(10);
      }
    });

    it('rejects pageSize over 100', () => {
      const result = customerListQuerySchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Service Tests (mocked prisma)
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/client', () => ({
  prisma: {
    customer: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    booking: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/client';
import {
  findOrCreateCustomer,
  findCustomerById,
  getCustomerList,
} from '@/lib/services/customer.service';

describe('Customer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findOrCreateCustomer
  // -----------------------------------------------------------------------
  describe('findOrCreateCustomer', () => {
    it('calls upsert with correct args', async () => {
      const input = {
        email: 'tanaka@example.com',
        name: '田中太郎',
        phone: '090-1234-5678',
        locale: 'ja' as const,
      };
      const mockCustomer = { id: 'cust-1', ...input };
      (prisma.customer.upsert as jest.Mock).mockResolvedValueOnce(mockCustomer);

      const result = await findOrCreateCustomer(input);

      expect(result).toEqual(mockCustomer);
      expect(prisma.customer.upsert).toHaveBeenCalledWith({
        where: { email: 'tanaka@example.com' },
        update: {},
        create: {
          email: 'tanaka@example.com',
          name: '田中太郎',
          phone: '090-1234-5678',
          locale: 'ja',
        },
      });
    });

    it('normalizes empty phone to undefined', async () => {
      const input = {
        email: 'test@example.com',
        name: 'Test',
        phone: '',
        locale: 'ja' as const,
      };
      (prisma.customer.upsert as jest.Mock).mockResolvedValueOnce({ id: 'cust-2' });

      await findOrCreateCustomer(input);

      expect(prisma.customer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            phone: undefined,
          }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // findCustomerById
  // -----------------------------------------------------------------------
  describe('findCustomerById', () => {
    it('calls findUnique with correct id', async () => {
      const mockCustomer = { id: 'cust-1', name: 'Test' };
      (prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce(mockCustomer);

      const result = await findCustomerById('cust-1');

      expect(result).toEqual(mockCustomer);
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
    });

    it('returns null when not found', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await findCustomerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // getCustomerList
  // -----------------------------------------------------------------------
  describe('getCustomerList', () => {
    // Helper to create a mock customer row from prisma.customer.findMany
    function mockCustomerRow(overrides: Partial<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      createdAt: Date;
      outstandingAmount: number;
      assignedStaff: { name: string } | null;
    }> = {}) {
      return {
        id: overrides.id ?? 'cust-1',
        name: overrides.name ?? 'Test Customer',
        email: overrides.email ?? 'test@example.com',
        phone: overrides.phone ?? null,
        createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
        outstandingAmount: overrides.outstandingAmount ?? 0,
        assignedStaff: overrides.assignedStaff ?? null,
      };
    }

    function setupEmptyMocks() {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce([]);
      // booking.groupBy should not be called when no customers
    }

    function setupCustomersWithBookings(
      customers: ReturnType<typeof mockCustomerRow>[],
      confirmedStats: Array<{
        customerId: string;
        _count: { _all: number };
        _max: { startsAt: Date | null };
      }> = [],
      upcomingStats: Array<{
        customerId: string;
        _min: { startsAt: Date | null };
      }> = []
    ) {
      (prisma.customer.findMany as jest.Mock).mockResolvedValueOnce(customers);
      (prisma.booking.groupBy as jest.Mock)
        .mockResolvedValueOnce(confirmedStats)
        .mockResolvedValueOnce(upcomingStats);
    }

    it('returns empty list with defaults when no customers', async () => {
      setupEmptyMocks();

      const result = await getCustomerList();

      expect(result).toEqual({
        customers: [],
        total: 0,
        page: 1,
        pageSize: 25,
      });
    });

    it('builds search filter (OR on name/email/phone)', async () => {
      setupEmptyMocks();

      await getCustomerList({ search: 'tanaka' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'tanaka', mode: 'insensitive' } },
              { email: { contains: 'tanaka', mode: 'insensitive' } },
              { phone: { contains: 'tanaka', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('filters by assignedStaffId when provided', async () => {
      setupEmptyMocks();

      await getCustomerList({ assignedStaffId: 'staff-1' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedStaffId: 'staff-1',
          }),
        })
      );
    });

    it('computes visitCount and lastVisitDate from booking.groupBy results', async () => {
      const customer = mockCustomerRow({ id: 'cust-1' });
      const lastVisit = new Date('2024-06-15T10:00:00Z');

      setupCustomersWithBookings(
        [customer],
        [{ customerId: 'cust-1', _count: { _all: 5 }, _max: { startsAt: lastVisit } }],
        []
      );

      const result = await getCustomerList();

      expect(result.customers[0].visitCount).toBe(5);
      expect(result.customers[0].lastVisitDate).toBe(lastVisit.toISOString());
    });

    it('computes nextBookingDate from upcoming bookings', async () => {
      const customer = mockCustomerRow({ id: 'cust-1' });
      const nextDate = new Date('2025-01-20T14:00:00Z');

      setupCustomersWithBookings(
        [customer],
        [{ customerId: 'cust-1', _count: { _all: 2 }, _max: { startsAt: new Date('2024-12-01') } }],
        [{ customerId: 'cust-1', _min: { startsAt: nextDate } }]
      );

      const result = await getCustomerList();

      expect(result.customers[0].nextBookingDate).toBe(nextDate.toISOString());
    });

    it('sorts by name using localeCompare ja', async () => {
      const customers = [
        mockCustomerRow({ id: 'c1', name: 'Charlie', createdAt: new Date('2024-01-01') }),
        mockCustomerRow({ id: 'c2', name: 'Alice', createdAt: new Date('2024-01-02') }),
        mockCustomerRow({ id: 'c3', name: 'Bob', createdAt: new Date('2024-01-03') }),
      ];

      setupCustomersWithBookings(customers, [], []);

      const result = await getCustomerList({ sortBy: 'name', sortOrder: 'asc' });

      expect(result.customers.map((c) => c.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts by visitCount', async () => {
      const customers = [
        mockCustomerRow({ id: 'c1', name: 'A' }),
        mockCustomerRow({ id: 'c2', name: 'B' }),
        mockCustomerRow({ id: 'c3', name: 'C' }),
      ];

      setupCustomersWithBookings(
        customers,
        [
          { customerId: 'c1', _count: { _all: 1 }, _max: { startsAt: null } },
          { customerId: 'c2', _count: { _all: 10 }, _max: { startsAt: null } },
          { customerId: 'c3', _count: { _all: 5 }, _max: { startsAt: null } },
        ],
        []
      );

      const result = await getCustomerList({ sortBy: 'visitCount', sortOrder: 'desc' });

      expect(result.customers.map((c) => c.visitCount)).toEqual([10, 5, 1]);
    });

    it('sorts by lastVisitDate', async () => {
      const customers = [
        mockCustomerRow({ id: 'c1', name: 'A' }),
        mockCustomerRow({ id: 'c2', name: 'B' }),
        mockCustomerRow({ id: 'c3', name: 'C' }),
      ];

      setupCustomersWithBookings(
        customers,
        [
          { customerId: 'c1', _count: { _all: 1 }, _max: { startsAt: new Date('2024-03-01') } },
          { customerId: 'c2', _count: { _all: 1 }, _max: { startsAt: new Date('2024-06-01') } },
          { customerId: 'c3', _count: { _all: 1 }, _max: { startsAt: new Date('2024-01-01') } },
        ],
        []
      );

      const result = await getCustomerList({ sortBy: 'lastVisitDate', sortOrder: 'desc' });

      expect(result.customers.map((c) => c.name)).toEqual(['B', 'A', 'C']);
    });

    it('sorts by createdAt desc by default', async () => {
      const customers = [
        mockCustomerRow({ id: 'c1', name: 'First', createdAt: new Date('2024-01-01') }),
        mockCustomerRow({ id: 'c2', name: 'Second', createdAt: new Date('2024-06-01') }),
        mockCustomerRow({ id: 'c3', name: 'Third', createdAt: new Date('2024-03-01') }),
      ];

      setupCustomersWithBookings(customers, [], []);

      const result = await getCustomerList();

      expect(result.customers.map((c) => c.name)).toEqual(['Second', 'Third', 'First']);
    });

    it('paginates correctly (page 2, pageSize 2, 5 total)', async () => {
      const customers = [
        mockCustomerRow({ id: 'c1', name: 'A', createdAt: new Date('2024-01-01') }),
        mockCustomerRow({ id: 'c2', name: 'B', createdAt: new Date('2024-02-01') }),
        mockCustomerRow({ id: 'c3', name: 'C', createdAt: new Date('2024-03-01') }),
        mockCustomerRow({ id: 'c4', name: 'D', createdAt: new Date('2024-04-01') }),
        mockCustomerRow({ id: 'c5', name: 'E', createdAt: new Date('2024-05-01') }),
      ];

      setupCustomersWithBookings(customers, [], []);

      const result = await getCustomerList({ page: 2, pageSize: 2 });

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(2);
      expect(result.customers).toHaveLength(2);
      // Default sort is createdAt desc: E, D, C, B, A  -> page 2 = C, B
      expect(result.customers.map((c) => c.name)).toEqual(['C', 'B']);
    });

    it('uses defaults: page=1, pageSize=25', async () => {
      setupEmptyMocks();

      const result = await getCustomerList({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });
  });
});
