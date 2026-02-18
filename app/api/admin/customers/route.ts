import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getCustomerList } from '@/lib/services/customer.service'
import { customerListQuerySchema } from '@/lib/validations/customer'

/**
 * GET /api/admin/customers
 *
 * Admin-only CRM list endpoint with search/filter/sort/pagination.
 */
export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const rawInput = {
    search: searchParams.get('search') || undefined,
    assignedStaffId: searchParams.get('assignedStaffId') || undefined,
    page: searchParams.get('page') || undefined,
    pageSize: searchParams.get('pageSize') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: searchParams.get('sortOrder') || undefined,
  }

  const parsed = customerListQuerySchema.safeParse(rawInput)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  try {
    const result = await getCustomerList(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch customer list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
