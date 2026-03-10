import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getKaruteRecordsByCustomer } from '@/lib/services/karute.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await getKaruteRecordsByCustomer(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Map to a lighter shape for the history list, sorted by booking date (most recent first)
    const records = result.data
      .map((record) => ({
        id: record.id,
        createdAt: record.createdAt,
        status: record.status,
        aiSummary: record.aiSummary ?? null,
        workerName: record.worker.name,
        entryCount: record.entries.length,
        bookingId: record.booking?.id ?? null,
        bookingDate: record.booking?.startsAt ?? null,
        entries: record.entries.map((e) => ({
          category: e.category,
          content: e.content,
        })),
      }))
      .sort(
        (a, b) =>
          new Date(b.bookingDate ?? b.createdAt).getTime() -
          new Date(a.bookingDate ?? a.createdAt).getTime()
      )

    return NextResponse.json(records)
  } catch (error) {
    console.error('Failed to fetch customer karute records:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
