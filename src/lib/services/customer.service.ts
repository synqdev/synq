/**
 * Customer Service
 *
 * Handles customer creation and lookup operations.
 * Implements lazy auth: customers are created without passwords,
 * identified by email for repeat bookings.
 */

import { prisma } from '@/lib/db/client';
import type { RegisterCustomerInput } from '@/lib/validations/customer';

export type CustomerListSortBy = 'name' | 'visitCount' | 'lastVisitDate' | 'createdAt';
export type CustomerListSortOrder = 'asc' | 'desc';

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  assignedStaffName: string | null;
  visitCount: number;
  lastVisitDate: string | null;
  nextBookingDate: string | null;
  createdAt: string;
  outstandingAmount: number;
}

interface GetCustomerListParams {
  search?: string;
  assignedStaffId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: CustomerListSortBy;
  sortOrder?: CustomerListSortOrder;
}

/**
 * Finds an existing customer by email or creates a new one.
 *
 * Uses upsert to:
 * - Return existing customer if email matches (idempotent registration)
 * - Create new customer if email not found
 *
 * @param input - Customer registration data (validated by Zod)
 * @returns The found or created customer record
 *
 * @example
 * const customer = await findOrCreateCustomer({
 *   email: 'tanaka@example.com',
 *   name: '田中太郎',
 *   phone: '090-1234-5678',
 *   locale: 'ja',
 * });
 */
export async function findOrCreateCustomer(input: RegisterCustomerInput) {
  // Normalize phone: treat empty string as undefined
  const phone = input.phone?.trim() || undefined;

  return prisma.customer.upsert({
    where: { email: input.email },
    update: {}, // Don't update existing customer data
    create: {
      email: input.email,
      name: input.name,
      phone,
      locale: input.locale,
    },
  });
}

/**
 * Finds a customer by their ID.
 *
 * @param customerId - The customer's UUID
 * @returns The customer record or null if not found
 */
export async function findCustomerById(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
  });
}

/**
 * Returns customers for admin CRM list with computed metrics from bookings.
 *
 * Metrics are derived from actual bookings, not denormalized customer fields:
 * - visitCount: count of CONFIRMED bookings
 * - lastVisitDate: max(startsAt) of CONFIRMED bookings
 * - nextBookingDate: nearest future CONFIRMED booking
 */
export async function getCustomerList(params: GetCustomerListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const sortBy: CustomerListSortBy = params.sortBy ?? 'createdAt';
  const sortOrder: CustomerListSortOrder = params.sortOrder ?? 'desc';
  const search = params.search?.trim();
  const assignedStaffId = params.assignedStaffId?.trim();

  const where = {
    ...(search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }
      : {}),
    ...(assignedStaffId ? { assignedStaffId } : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      outstandingAmount: true,
      assignedStaff: {
        select: {
          name: true,
        },
      },
    },
  });

  const customerIds = customers.map((customer) => customer.id);

  let confirmedBookingStats: Array<{
    customerId: string;
    _count: { _all: number };
    _max: { startsAt: Date | null };
  }> = [];
  let nextBookingStats: Array<{
    customerId: string;
    _min: { startsAt: Date | null };
  }> = [];

  if (customerIds.length > 0) {
    const [confirmedStats, upcomingStats] = await Promise.all([
      prisma.booking.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: customerIds },
          status: 'CONFIRMED',
        },
        _count: { _all: true },
        _max: { startsAt: true },
      }),
      prisma.booking.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: customerIds },
          status: 'CONFIRMED',
          startsAt: { gte: new Date() },
        },
        _min: { startsAt: true },
      }),
    ]);

    confirmedBookingStats = confirmedStats;
    nextBookingStats = upcomingStats;
  }

  const statsByCustomerId = new Map(
    confirmedBookingStats.map((stat) => [
      stat.customerId,
      {
        visitCount: stat._count._all,
        lastVisitDate: stat._max.startsAt,
      },
    ])
  );

  const nextByCustomerId = new Map(
    nextBookingStats.map((stat) => [stat.customerId, stat._min.startsAt])
  );

  const list: CustomerListItem[] = customers.map((customer) => {
    const stats = statsByCustomerId.get(customer.id);
    const nextBookingDate = nextByCustomerId.get(customer.id);

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      assignedStaffName: customer.assignedStaff?.name ?? null,
      visitCount: stats?.visitCount ?? 0,
      lastVisitDate: stats?.lastVisitDate ? stats.lastVisitDate.toISOString() : null,
      nextBookingDate: nextBookingDate ? nextBookingDate.toISOString() : null,
      createdAt: customer.createdAt.toISOString(),
      outstandingAmount: customer.outstandingAmount,
    };
  });

  const compareByDate = (left: string | null, right: string | null) => {
    const leftMs = left ? new Date(left).getTime() : Number.NEGATIVE_INFINITY;
    const rightMs = right ? new Date(right).getTime() : Number.NEGATIVE_INFINITY;
    return leftMs - rightMs;
  };

  list.sort((left, right) => {
    let base = 0;
    switch (sortBy) {
      case 'name':
        base = left.name.localeCompare(right.name, 'ja');
        break;
      case 'visitCount':
        base = left.visitCount - right.visitCount;
        break;
      case 'lastVisitDate':
        base = compareByDate(left.lastVisitDate, right.lastVisitDate);
        break;
      case 'createdAt':
      default:
        base = compareByDate(left.createdAt, right.createdAt);
        break;
    }

    if (base === 0) {
      base = left.name.localeCompare(right.name, 'ja');
    }

    return sortOrder === 'desc' ? -base : base;
  });

  const total = list.length;
  const start = (page - 1) * pageSize;
  const paginatedCustomers = list.slice(start, start + pageSize);

  return {
    customers: paginatedCustomers,
    total,
    page,
    pageSize,
  };
}
