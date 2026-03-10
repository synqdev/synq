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
 * IMPORTANT: The operation callback receives a transaction client (`tx`).
 * You MUST use `tx` (not the global `prisma`) for all queries inside the
 * callback, otherwise the RLS session variables won't be visible to your query.
 */

import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './client'

export interface RLSContext {
  /** UUID of the current customer (optional) */
  customerId?: string
  /** Role for the current request */
  role?: 'admin' | 'user'
}

/**
 * Transaction client type used inside withRLSContext callbacks.
 * Has the same query methods as PrismaClient but without connection management.
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Executes a database operation with RLS context variables set.
 *
 * Wraps the operation in a Prisma interactive transaction to ensure
 * the set_config calls and the actual query run on the same database
 * connection. Without this, connection pooling could route set_config
 * and the query to different connections, losing the RLS context.
 *
 * @param context - RLS context containing customer ID and/or role
 * @param operation - Database operation receiving a transaction client
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
  operation: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.customer_id', ${context.customerId || ''}, true)`
    await tx.$executeRaw`SELECT set_config('app.role', ${context.role || 'user'}, true)`
    return operation(tx)
  })
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
