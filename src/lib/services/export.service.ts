import { prisma } from '@/lib/db/client'
import { getRevenueSummary } from './reporting.service'

const BOM = '\uFEFF'

export function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const headerLine = headers.map(escape).join(',')
  const dataLines = rows.map((row) => row.map(escape).join(','))
  return BOM + [headerLine, ...dataLines].join('\n')
}

export async function exportCustomers(params?: {
  search?: string
  assignedStaffId?: string
}): Promise<string> {
  const where: Record<string, unknown> = {}

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search } },
    ]
  }
  if (params?.assignedStaffId) {
    where.assignedStaffId = params.assignedStaffId
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      assignedStaff: { select: { name: true } },
    },
  })

  const headers = [
    'ID', 'Name', 'Email', 'Phone', 'Assigned Staff',
    'Visit Count', 'Last Visit', 'Registration Date', 'Outstanding Amount',
  ]

  const rows = customers.map((c) => [
    c.id,
    c.name,
    c.email,
    c.phone ?? '',
    c.assignedStaff?.name ?? '',
    String(c.visitCount),
    c.lastVisitDate ? c.lastVisitDate.toISOString().split('T')[0] : '',
    c.createdAt.toISOString().split('T')[0],
    String(c.outstandingAmount),
  ])

  return generateCSV(headers, rows)
}

export async function exportBookings(params: {
  startDate: Date
  endDate: Date
}): Promise<string> {
  const { startDate, endDate } = params

  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: startDate, lt: endDate },
      status: 'CONFIRMED',
    },
    orderBy: { startsAt: 'desc' },
    include: {
      customer: { select: { name: true, email: true } },
      service: { select: { name: true, price: true } },
      worker: { select: { name: true } },
      resource: { select: { name: true } },
    },
  })

  const headers = [
    'Booking ID', 'Date', 'Time', 'Customer Name', 'Customer Email',
    'Service', 'Worker', 'Resource', 'Status', 'Price',
  ]

  const rows = bookings.map((b) => [
    b.id,
    b.startsAt.toISOString().split('T')[0],
    b.startsAt.toISOString().split('T')[1]?.slice(0, 5) ?? '',
    b.customer.name,
    b.customer.email,
    b.service.name,
    b.worker.name,
    b.resource.name,
    b.status,
    String(b.service.price),
  ])

  return generateCSV(headers, rows)
}

export async function exportRevenue(params: {
  startDate: Date
  endDate: Date
  groupBy: 'day' | 'week' | 'month'
}): Promise<string> {
  const summary = await getRevenueSummary(params)

  const headers = [
    'Period', 'Total Revenue', 'Bookings', 'New Customers', 'Existing Customers',
  ]

  const rows = summary.map((s) => [
    s.period.split('T')[0],
    String(s.totalRevenue),
    String(s.bookingCount),
    String(s.newCustomerCount),
    String(s.existingCustomerCount),
  ])

  return generateCSV(headers, rows)
}
