import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getRevenueSummary, getDashboardTotals } from '@/lib/services/reporting.service'
import { revenueQuerySchema } from '@/lib/validations/reporting'

export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const rawInput = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    groupBy: searchParams.get('groupBy') || undefined,
  }

  const parsed = revenueQuerySchema.safeParse(rawInput)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const [summary, totals] = await Promise.all([
      getRevenueSummary(parsed.data),
      getDashboardTotals(parsed.data),
    ])
    return NextResponse.json({ summary, totals })
  } catch (error) {
    console.error('Failed to fetch revenue data:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 })
  }
}
