/**
 * RLS Context Utility
 *
 * Provides helpers to set PostgreSQL session variables for Row Level Security.
 * These variables are checked by RLS policies to control data access.
 *
 * Session variables:
 * - app.customer_id: UUID of the current customer
 * - app.role: 'admin' | 'user' role for the current request
 *
 * Usage:
 *   const result = await withRLSContext(
 *     { customerId: '...', role: 'user' },
 *     () => prisma.booking.findMany()
 *   )
 *
 * Note: For MVP, Prisma operates with full database access. This utility
 * is provided for future use when enabling full RLS enforcement.
 */

import { prisma } from './client'

export interface RLSContext {
  /** UUID of the current customer (optional) */
  customerId?: string
  /** Role for the current request */
  role?: 'admin' | 'user'
}

/**
 * Executes a database operation with RLS context variables set.
 *
 * Sets PostgreSQL session variables that RLS policies can check,
 * then executes the provided operation.
 *
 * @param context - RLS context containing customer ID and/or role
 * @param operation - Database operation to execute
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * // Execute a query as a specific customer
 * const bookings = await withRLSContext(
 *   { customerId: customer.id, role: 'user' },
 *   () => prisma.booking.findMany()
 * )
 *
 * // Execute a query as admin
 * const allBookings = await withRLSContext(
 *   { role: 'admin' },
 *   () => prisma.booking.findMany()
 * )
 * ```
 */
export async function withRLSContext<T>(
  context: RLSContext,
  operation: () => Promise<T>
): Promise<T> {
  // Set session variables for RLS
  // Using Prisma's raw query with parameterized values
  await prisma.$executeRaw`SELECT set_config('app.customer_id', ${context.customerId || ''}, true)`
  await prisma.$executeRaw`SELECT set_config('app.role', ${context.role || 'user'}, true)`

  return operation()
}

/**
 * Clears RLS context variables.
 *
 * Call this after a request completes to ensure the next request
 * doesn't inherit the previous context.
 */
export async function clearRLSContext(): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.customer_id', '', true)`
  await prisma.$executeRaw`SELECT set_config('app.role', '', true)`
}
