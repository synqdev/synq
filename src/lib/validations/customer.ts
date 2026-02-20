/**
 * Customer Validation Schemas
 *
 * Zod schemas for validating customer registration and profile data.
 * Ensures data integrity and provides type inference for TypeScript.
 */

import { z } from 'zod';

/**
 * Schema for registering a new customer.
 *
 * Validates:
 * - email: Valid email format
 * - name: Non-empty string, max 100 chars
 * - phone: Optional, max 20 chars
 * - locale: Either 'ja' or 'en', defaults to 'ja'
 */
export const registerCustomerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  name: z.string().min(1, { message: 'Name is required' }).max(100, { message: 'Name must be 100 characters or less' }),
  phone: z.string().max(20, { message: 'Phone must be 20 characters or less' }).optional().or(z.literal('')),
  locale: z.enum(['ja', 'en']).default('ja'),
});

/**
 * Type inferred from registerCustomerSchema
 */
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
