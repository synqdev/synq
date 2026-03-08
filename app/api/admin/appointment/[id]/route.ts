/**
 * Admin Appointment Detail API
 *
 * Returns full appointment data including booking, customer, worker,
 * service, karute records, and recording sessions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'

/**
 * GET /api/admin/appointment/[id]
 *
 * Fetches a single booking by ID with all related data needed
 * for the appointment workstation page.
 *
 * @returns Booking with customer, worker, service, karuteRecords, recordingSessions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          locale: true,
          notes: true,
        },
      },
      worker: {
        select: {
          id: true,
          name: true,
          nameEn: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          duration: true,
        },
      },
      karuteRecords: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
      recordingSessions: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
        },
      },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(booking)
}
