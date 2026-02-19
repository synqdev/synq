import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getRepeatCustomerRate } from '@/lib/services/reporting.service'
import { workerMetricsQuerySchema } from '@/lib/validations/reporting'

export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const rawInput = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  }

  const parsed = workerMetricsQuerySchema.safeParse(rawInput)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const retention = await getRepeatCustomerRate(parsed.data)
    return NextResponse.json({ retention })
  } catch (error) {
    console.error('Failed to fetch retention data:', error)
    return NextResponse.json({ error: 'Failed to fetch retention data' }, { status: 500 })
  }
}
