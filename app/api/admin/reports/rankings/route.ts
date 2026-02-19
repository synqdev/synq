import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getWorkerRankings } from '@/lib/services/reporting.service'
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
    const rankings = await getWorkerRankings(parsed.data)
    return NextResponse.json({ rankings })
  } catch (error) {
    console.error('Failed to fetch rankings:', error)
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
  }
}
