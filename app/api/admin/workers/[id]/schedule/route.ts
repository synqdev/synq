import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const worker = await prisma.worker.findUnique({ where: { id } })
  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const existing = await prisma.workerSchedule.findMany({
    where: { workerId: id, specificDate: null },
    orderBy: { dayOfWeek: 'asc' },
  })

  const schedules = Array.from({ length: 7 }, (_, i) => {
    const found = existing.find((s) => s.dayOfWeek === i)
    if (found) {
      return {
        dayOfWeek: i,
        startTime: found.startTime,
        endTime: found.endTime,
        isAvailable: found.isAvailable,
      }
    }
    return {
      dayOfWeek: i,
      startTime: '09:00',
      endTime: '18:00',
      isAvailable: false,
    }
  })

  return NextResponse.json({ schedules })
}
