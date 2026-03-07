'use server'

/**
 * Worker Server Actions
 *
 * Server-side handlers for worker CRUD operations:
 * - Create worker
 * - Update worker
 * - Delete worker (soft delete)
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { workerSchema } from '@/lib/validations/worker'
import { getAdminSession } from '@/lib/auth/admin'

/**
 * Create a new worker.
 *
 * @param formData - Form data with name, nameEn, isActive
 * @returns Success status with created worker ID
 * @throws Error if not authenticated or validation fails
 */
export async function createWorker(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = workerSchema.parse({
    name: raw.name,
    nameEn: raw.nameEn || undefined,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  const worker = await prisma.worker.create({
    data: {
      name: parsed.name,
      nameEn: parsed.nameEn || null,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/workers', 'page')
  return { success: true, workerId: worker.id }
}

/**
 * Update an existing worker.
 *
 * @param formData - Form data with id, name, nameEn, isActive
 * @returns Success status
 * @throws Error if not authenticated or validation fails
 */
export async function updateWorker(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const id = formData.get('id') as string
  if (!id) throw new Error('Worker ID is required')

  const raw = Object.fromEntries(formData)
  const parsed = workerSchema.parse({
    name: raw.name,
    nameEn: raw.nameEn || undefined,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  await prisma.worker.update({
    where: { id },
    data: {
      name: parsed.name,
      nameEn: parsed.nameEn || null,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/workers', 'page')
  return { success: true }
}

/**
 * Soft delete a worker by setting isActive to false.
 *
 * Workers are soft-deleted to preserve booking history.
 *
 * @param id - UUID of the worker to delete
 * @returns Success status
 * @throws Error if not authenticated or worker not found
 */
export async function deleteWorker(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  await prisma.worker.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/[locale]/admin/workers', 'page')
  return { success: true }
}
