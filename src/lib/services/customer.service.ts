/**
 * Customer Service
 *
 * Handles customer creation and lookup operations.
 * Implements lazy auth: customers are created without passwords,
 * identified by email for repeat bookings.
 */

import { prisma } from '@/lib/db/client';
import type { RegisterCustomerInput } from '@/lib/validations/customer';

/**
 * Finds an existing customer by email or creates a new one.
 *
 * Uses upsert to:
 * - Return existing customer if email matches (idempotent registration)
 * - Create new customer if email not found
 *
 * @param input - Customer registration data (validated by Zod)
 * @returns The found or created customer record
 *
 * @example
 * const customer = await findOrCreateCustomer({
 *   email: 'tanaka@example.com',
 *   name: '田中太郎',
 *   phone: '090-1234-5678',
 *   locale: 'ja',
 * });
 */
export async function findOrCreateCustomer(input: RegisterCustomerInput) {
  // Normalize phone: treat empty string as undefined
  const phone = input.phone?.trim() || undefined;

  return prisma.customer.upsert({
    where: { email: input.email },
    update: {}, // Don't update existing customer data
    create: {
      email: input.email,
      name: input.name,
      phone,
      locale: input.locale,
    },
  });
}

/**
 * Finds a customer by their ID.
 *
 * @param customerId - The customer's UUID
 * @returns The customer record or null if not found
 */
export async function findCustomerById(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
  });
}
