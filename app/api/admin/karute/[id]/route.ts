/**
 * Karute Record API Route
 *
 * GET /api/admin/karute/[id]
 * Returns a karute record with entries, segments, customer, worker, and booking data.
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const record = await prisma.karuteRecord.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { displayOrder: 'asc' },
        },
        customer: {
          select: { id: true, name: true },
        },
        worker: {
          select: { id: true, name: true },
        },
        booking: {
          select: { id: true, startsAt: true },
        },
        recordingSessions: {
          include: {
            segments: {
              orderBy: { segmentIndex: 'asc' },
            },
          },
        },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Karute record not found' }, { status: 404 })
    }

    return NextResponse.json(record)
  } catch (error) {
    console.error('[api/admin/karute] Failed to fetch record', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
