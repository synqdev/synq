import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { exportBookings } from '@/lib/services/export.service'
import { workerMetricsQuerySchema } from '@/lib/validations/reporting'

export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const parsed = workerMetricsQuerySchema.safeParse({
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const csv = await exportBookings(parsed.data)
    const date = new Date().toISOString().split('T')[0]
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookings_${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export bookings:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
