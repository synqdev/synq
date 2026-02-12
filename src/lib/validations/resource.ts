/**
 * Resource Validation Schema
 *
 * Zod schema for validating resource (bed) CRUD operations.
 */

import { z } from 'zod'

/**
 * Schema for creating/updating a resource.
 *
 * Validates:
 * - name: Required name (1-100 chars)
 * - isActive: Boolean status (defaults to true)
 */
export const resourceSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or less' }),
  isActive: z.coerce.boolean().default(true),
})

export type ResourceInput = z.infer<typeof resourceSchema>
