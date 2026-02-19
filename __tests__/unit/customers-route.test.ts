/**
 * @jest-environment node
 */

/**
 * Admin Customers Route Tests
 *
 * Tests for GET /api/admin/customers route handler.
 * Verifies auth gating, query param validation, and service delegation.
 */

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/services/customer.service', () => ({
  getCustomerList: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getCustomerList } from '@/lib/services/customer.service';
import { GET } from '../../app/api/admin/customers/route';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/customers');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/admin/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not admin', async () => {
    (getAdminSession as jest.Mock).mockResolvedValueOnce(false);

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid query params', async () => {
    (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

    const response = await GET(makeRequest({ sortBy: 'invalid' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid query parameters');
    expect(body.details).toBeDefined();
  });

  it('returns 200 with paginated result on valid request', async () => {
    (getAdminSession as jest.Mock).mockResolvedValueOnce(true);

    const mockResult = {
      customers: [
        {
          id: 'cust-1',
          name: 'Test',
          email: 'test@example.com',
          phone: null,
          assignedStaffName: null,
          visitCount: 0,
          lastVisitDate: null,
          nextBookingDate: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          outstandingAmount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    };
    (getCustomerList as jest.Mock).mockResolvedValueOnce(mockResult);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customers).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
  });

  it('passes parsed query params correctly to getCustomerList', async () => {
    (getAdminSession as jest.Mock).mockResolvedValueOnce(true);
    (getCustomerList as jest.Mock).mockResolvedValueOnce({
      customers: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });

    await GET(
      makeRequest({
        search: 'tanaka',
        page: '2',
        pageSize: '10',
        sortBy: 'name',
        sortOrder: 'asc',
      })
    );

    expect(getCustomerList).toHaveBeenCalledWith({
      search: 'tanaka',
      page: 2,
      pageSize: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });
});
