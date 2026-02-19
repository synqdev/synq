import { z } from 'zod'

export const revenueQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
}).refine((data) => data.endDate > data.startDate, {
  message: 'endDate must be after startDate',
  path: ['endDate'],
}).refine((data) => {
  const diffMs = data.endDate.getTime() - data.startDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 366
}, {
  message: 'Date range must not exceed 1 year',
  path: ['endDate'],
})

export const workerMetricsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'endDate must be after startDate',
  path: ['endDate'],
})
