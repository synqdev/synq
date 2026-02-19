import { z } from 'zod'

const dateRangeBase = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
})

const dateRangeRefinement = (data: { startDate: Date; endDate: Date }) =>
  data.endDate > data.startDate

export const revenueQuerySchema = dateRangeBase
  .extend({ groupBy: z.enum(['day', 'week', 'month']).default('day') })
  .refine(dateRangeRefinement, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((data) => {
    const diffMs = data.endDate.getTime() - data.startDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays <= 366
  }, {
    message: 'Date range must not exceed 1 year',
    path: ['endDate'],
  })

export const workerMetricsQuerySchema = dateRangeBase
  .refine(dateRangeRefinement, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
