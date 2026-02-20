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
 *     (tx) => tx.booking.findMany()
 *   )
 *
 * Note: For MVP, Prisma operates with full database access. This utility
 * is provided for future use when enabling full RLS enforcement.
 */

import { Prisma } from '@prisma/client'
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
 * Uses an interactive transaction to ensure the session variables and all
 * database operations run on the same connection, preventing context leakage
 * across pooled connections.
 *
 * @param context - RLS context containing customer ID and/or role
 * @param operation - Database operation to execute (receives the transaction client)
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * // Execute a query as a specific customer
 * const bookings = await withRLSContext(
 *   { customerId: customer.id, role: 'user' },
 *   (tx) => tx.booking.findMany()
 * )
 *
 * // Execute a query as admin
 * const allBookings = await withRLSContext(
 *   { role: 'admin' },
 *   (tx) => tx.booking.findMany()
 * )
 * ```
 */
export async function withRLSContext<T>(
  context: RLSContext,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set session variables scoped to this transaction (true = LOCAL scope)
    await tx.$executeRaw`SELECT set_config('app.customer_id', ${context.customerId ?? ''}, true)`
    await tx.$executeRaw`SELECT set_config('app.role', ${context.role ?? 'user'}, true)`

    return operation(tx)
  })
}
