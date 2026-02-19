import { prisma } from '@/lib/db/client'
import { Prisma } from '@prisma/client'
import type {
  RevenuePeriod,
  WorkerMetric,
  DashboardTotals,
  WorkerRanking,
  RetentionMetrics,
} from '@/lib/types/reporting'

export type {
  RevenuePeriod,
  WorkerMetric,
  DashboardTotals,
  WorkerRanking,
  RetentionMetrics,
}

type GroupBy = 'day' | 'week' | 'month'

export async function getRevenueSummary(params: {
  startDate: Date
  endDate: Date
  groupBy: GroupBy
}): Promise<RevenuePeriod[]> {
  const { startDate, endDate, groupBy } = params
  const trunc = groupBy === 'day' ? 'day' : groupBy === 'week' ? 'week' : 'month'

  // Revenue and booking count grouped by period
  const rows = await prisma.$queryRaw<
    { period: Date; total_revenue: bigint | null; booking_count: bigint }[]
  >(
    Prisma.sql`
      SELECT date_trunc(${trunc}, b."startsAt") as period,
             COALESCE(SUM(s.price), 0) as total_revenue,
             COUNT(*)::bigint as booking_count
      FROM "Booking" b
      JOIN "Service" s ON b."serviceId" = s.id
      WHERE b."startsAt" >= ${startDate}
        AND b."startsAt" < ${endDate}
        AND b.status = 'CONFIRMED'
      GROUP BY period
      ORDER BY period ASC
    `
  )

  // Get first-ever booking date per customer to determine new vs existing
  const firstBookings = await prisma.$queryRaw<
    { period: Date; new_count: bigint }[]
  >(
    Prisma.sql`
      WITH first_booking AS (
        SELECT "customerId", MIN("startsAt") as first_date
        FROM "Booking"
        WHERE status = 'CONFIRMED'
        GROUP BY "customerId"
      )
      SELECT date_trunc(${trunc}, fb.first_date) as period,
             COUNT(*)::bigint as new_count
      FROM first_booking fb
      WHERE fb.first_date >= ${startDate}
        AND fb.first_date < ${endDate}
      GROUP BY period
    `
  )

  const newCountMap = new Map(
    firstBookings.map((r) => [new Date(r.period).toISOString(), Number(r.new_count)])
  )

  // Unique customers per period
  const uniquePerPeriod = await prisma.$queryRaw<
    { period: Date; unique_count: bigint }[]
  >(
    Prisma.sql`
      SELECT date_trunc(${trunc}, b."startsAt") as period,
             COUNT(DISTINCT b."customerId")::bigint as unique_count
      FROM "Booking" b
      WHERE b."startsAt" >= ${startDate}
        AND b."startsAt" < ${endDate}
        AND b.status = 'CONFIRMED'
      GROUP BY period
    `
  )

  const uniqueMap = new Map(
    uniquePerPeriod.map((r) => [new Date(r.period).toISOString(), Number(r.unique_count)])
  )

  return rows.map((row) => {
    const key = new Date(row.period).toISOString()
    const totalCustomers = uniqueMap.get(key) ?? 0
    const newCustomerCount = newCountMap.get(key) ?? 0
    return {
      period: key,
      totalRevenue: Number(row.total_revenue ?? 0),
      bookingCount: Number(row.booking_count),
      newCustomerCount,
      existingCustomerCount: Math.max(0, totalCustomers - newCustomerCount),
    }
  })
}

export async function getWorkerMetrics(params: {
  startDate: Date
  endDate: Date
}): Promise<WorkerMetric[]> {
  const { startDate, endDate } = params

  const rows = await prisma.$queryRaw<
    { worker_id: string; worker_name: string; total_revenue: bigint | null; booking_count: bigint }[]
  >(
    Prisma.sql`
      SELECT w.id as worker_id,
             w.name as worker_name,
             COALESCE(SUM(s.price), 0) as total_revenue,
             COUNT(*)::bigint as booking_count
      FROM "Booking" b
      JOIN "Worker" w ON b."workerId" = w.id
      JOIN "Service" s ON b."serviceId" = s.id
      WHERE b."startsAt" >= ${startDate}
        AND b."startsAt" < ${endDate}
        AND b.status = 'CONFIRMED'
      GROUP BY w.id, w.name
      ORDER BY total_revenue DESC
    `
  )

  return rows.map((row) => {
    const totalRevenue = Number(row.total_revenue ?? 0)
    const bookingCount = Number(row.booking_count)
    return {
      workerId: row.worker_id,
      workerName: row.worker_name,
      totalRevenue,
      bookingCount,
      averagePerBooking: bookingCount > 0 ? Math.round(totalRevenue / bookingCount) : 0,
    }
  })
}

export async function getDashboardTotals(params: {
  startDate: Date
  endDate: Date
}): Promise<DashboardTotals> {
  const { startDate, endDate } = params

  const [result] = await prisma.$queryRaw<
    { total_revenue: bigint | null; total_bookings: bigint; unique_customers: bigint }[]
  >(
    Prisma.sql`
      SELECT COALESCE(SUM(s.price), 0) as total_revenue,
             COUNT(*)::bigint as total_bookings,
             COUNT(DISTINCT b."customerId")::bigint as unique_customers
      FROM "Booking" b
      JOIN "Service" s ON b."serviceId" = s.id
      WHERE b."startsAt" >= ${startDate}
        AND b."startsAt" < ${endDate}
        AND b.status = 'CONFIRMED'
    `
  )

  if (!result) {
    return { totalRevenue: 0, totalBookings: 0, uniqueCustomers: 0, averageRevenuePerBooking: 0 }
  }

  const totalRevenue = Number(result.total_revenue ?? 0)
  const totalBookings = Number(result.total_bookings)
  const uniqueCustomers = Number(result.unique_customers)

  return {
    totalRevenue,
    totalBookings,
    uniqueCustomers,
    averageRevenuePerBooking: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
  }
}

export async function getWorkerRankings(params: {
  startDate: Date
  endDate: Date
}): Promise<WorkerRanking[]> {
  const metrics = await getWorkerMetrics(params)
  const firstRevenue = metrics.length > 0 ? metrics[0].totalRevenue : 0

  return metrics.map((m, i) => ({
    rank: i + 1,
    workerId: m.workerId,
    workerName: m.workerName,
    totalRevenue: m.totalRevenue,
    bookingCount: m.bookingCount,
    differenceFromFirst: m.totalRevenue - firstRevenue,
  }))
}

export async function getRepeatCustomerRate(params: {
  startDate: Date
  endDate: Date
}): Promise<RetentionMetrics> {
  const { startDate, endDate } = params

  // Get customers who booked in the date range and whether they had prior bookings
  const rows = await prisma.$queryRaw<
    { customer_id: string; has_prior: boolean }[]
  >(
    Prisma.sql`
      WITH range_customers AS (
        SELECT DISTINCT "customerId" as customer_id
        FROM "Booking"
        WHERE "startsAt" >= ${startDate}
          AND "startsAt" < ${endDate}
          AND status = 'CONFIRMED'
      )
      SELECT rc.customer_id,
             EXISTS (
               SELECT 1 FROM "Booking" b
               WHERE b."customerId" = rc.customer_id
                 AND b."startsAt" < ${startDate}
                 AND b.status = 'CONFIRMED'
             ) as has_prior
      FROM range_customers rc
    `
  )

  const totalCustomers = rows.length
  const repeatCustomers = rows.filter((r) => r.has_prior).length
  const newCustomers = totalCustomers - repeatCustomers
  const repeatRate = totalCustomers > 0
    ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
    : 0

  return { totalCustomers, repeatCustomers, repeatRate, newCustomers }
}
