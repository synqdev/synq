import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { exportCustomers } from '@/lib/services/export.service'

export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') || undefined
  const assignedStaffId = searchParams.get('assignedStaffId') || undefined

  try {
    const csv = await exportCustomers({ search, assignedStaffId })
    const date = new Date().toISOString().split('T')[0]
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers_${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export customers:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
