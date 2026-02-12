/**
 * Worker Validation Schema
 *
 * Zod schema for validating worker CRUD operations.
 */

import { z } from 'zod'

/**
 * Schema for creating/updating a worker.
 *
 * Validates:
 * - name: Required Japanese name (1-100 chars)
 * - nameEn: Optional English name (max 100 chars)
 * - isActive: Boolean status (defaults to true)
 */
export const workerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or less' }),
  nameEn: z.string().max(100, { message: 'English name must be 100 characters or less' }).optional().or(z.literal('')),
  isActive: z.coerce.boolean().default(true),
})

export type WorkerInput = z.infer<typeof workerSchema>
