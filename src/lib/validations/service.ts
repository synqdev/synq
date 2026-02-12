/**
 * Service Validation Schema
 *
 * Zod schema for validating service CRUD operations.
 */

import { z } from 'zod'

/**
 * Schema for creating/updating a service.
 *
 * Validates:
 * - name: Required Japanese name (1-100 chars)
 * - nameEn: Optional English name (max 100 chars)
 * - description: Optional description (max 500 chars)
 * - duration: Required positive integer (minutes)
 * - price: Required non-negative integer (yen)
 * - isActive: Boolean status (defaults to true)
 */
export const serviceSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or less' }),
  nameEn: z.string().max(100, { message: 'English name must be 100 characters or less' }).optional().or(z.literal('')),
  description: z.string().max(500, { message: 'Description must be 500 characters or less' }).optional().or(z.literal('')),
  duration: z.coerce.number().int().positive({ message: 'Duration must be a positive number' }),
  price: z.coerce.number().int().nonnegative({ message: 'Price must be a non-negative number' }),
  isActive: z.coerce.boolean().default(true),
})

export type ServiceInput = z.infer<typeof serviceSchema>
