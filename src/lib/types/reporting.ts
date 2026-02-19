export interface RevenuePeriod {
  period: string
  totalRevenue: number
  bookingCount: number
  newCustomerCount: number
  existingCustomerCount: number
}

export interface WorkerMetric {
  workerId: string
  workerName: string
  totalRevenue: number
  bookingCount: number
  averagePerBooking: number
}

export interface DashboardTotals {
  totalRevenue: number
  totalBookings: number
  uniqueCustomers: number
  averageRevenuePerBooking: number
}

export interface WorkerRanking {
  rank: number
  workerId: string
  workerName: string
  totalRevenue: number
  bookingCount: number
  differenceFromFirst: number
}

export interface RetentionMetrics {
  totalCustomers: number
  repeatCustomers: number
  repeatRate: number
  newCustomers: number
}
