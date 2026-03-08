'use server'

/**
 * Karute Server Actions
 *
 * Server-side handlers for karute record, entry, and recording session mutations.
 * All actions require admin authentication and revalidate the dashboard on success.
 */

import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth/admin'
import {
  createKaruteRecord,
  updateKaruteRecord,
  deleteKaruteRecord,
  getKaruteRecord,
  createKaruteEntry,
  updateKaruteEntry,
  deleteKaruteEntry,
} from '@/lib/services/karute.service'
import {
  createRecordingSession,
  updateRecordingSession,
  deleteRecordingSession,
} from '@/lib/services/recording.service'
import type {
  CreateKaruteRecordInput,
  UpdateKaruteRecordInput,
  CreateKaruteEntryInput,
  UpdateKaruteEntryInput,
  CreateRecordingSessionInput,
  UpdateRecordingSessionInput,
} from '@/lib/validations/karute'

// ============================================================================
// KARUTE RECORD ACTIONS
// ============================================================================

/**
 * Create a new karute record.
 *
 * @param input - Karute record creation input
 * @returns Success status with the created record ID
 * @throws Error if not authenticated or creation fails
 */
export async function createKaruteRecordAction(input: CreateKaruteRecordInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await createKaruteRecord(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Update an existing karute record.
 *
 * @param input - Karute record update input (must include id)
 * @returns Success status with the updated record ID
 * @throws Error if not authenticated or update fails
 */
export async function updateKaruteRecordAction(input: UpdateKaruteRecordInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await updateKaruteRecord(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Delete a karute record and its associated data.
 *
 * @param id - UUID of the karute record to delete
 * @returns Success status
 * @throws Error if not authenticated or deletion fails
 */
export async function deleteKaruteRecordAction(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await deleteKaruteRecord(id)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

// ============================================================================
// KARUTE ENTRY ACTIONS
// ============================================================================

/**
 * Create a new karute entry.
 *
 * @param input - Karute entry creation input
 * @returns Success status with the created entry ID
 * @throws Error if not authenticated or creation fails
 */
export async function createKaruteEntryAction(input: CreateKaruteEntryInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await createKaruteEntry(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Update an existing karute entry.
 *
 * @param input - Karute entry update input (must include id)
 * @returns Success status with the updated entry ID
 * @throws Error if not authenticated or update fails
 */
export async function updateKaruteEntryAction(input: UpdateKaruteEntryInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await updateKaruteEntry(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Delete a karute entry.
 *
 * @param id - UUID of the karute entry to delete
 * @returns Success status
 * @throws Error if not authenticated or deletion fails
 */
export async function deleteKaruteEntryAction(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await deleteKaruteEntry(id)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

// ============================================================================
// STATUS ACTIONS
// ============================================================================

/**
 * Update a karute record's status (DRAFT -> REVIEW -> APPROVED).
 *
 * @param recordId - UUID of the karute record
 * @param status - New status value
 * @returns Success status
 * @throws Error if not authenticated or update fails
 */
export async function updateKaruteStatusAction(
  recordId: string,
  status: 'DRAFT' | 'REVIEW' | 'APPROVED'
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const current = await getKaruteRecord(recordId)
  if (!current.success) throw new Error('Karute record not found')

  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ['REVIEW'],
    REVIEW: ['APPROVED', 'DRAFT'],
    APPROVED: ['DRAFT'],
  }
  if (!allowedTransitions[current.data.status]?.includes(status)) {
    throw new Error(`Invalid status transition: ${current.data.status} → ${status}`)
  }

  const result = await updateKaruteRecord({ id: recordId, status })
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/karute/[id]', 'page')
  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}

// ============================================================================
// STATUS & TAGS ACTIONS
// ============================================================================

/**
 * Update a karute record's status (DRAFT -> REVIEW -> APPROVED).
 *
 * @param recordId - UUID of the karute record
 * @param status - New status value
 * @returns Success status
 * @throws Error if not authenticated or update fails
 */
export async function updateKaruteStatusAction(
  recordId: string,
  status: 'DRAFT' | 'REVIEW' | 'APPROVED'
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await updateKaruteRecord({ id: recordId, status })
  if (!result.success) throw new Error(result.error)

  revalidatePath(`/admin/karute/${recordId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

/**
 * Update tags on a karute entry.
 *
 * @param entryId - UUID of the karute entry
 * @param tags - Array of tag strings
 * @returns Success status
 * @throws Error if not authenticated or update fails
 */
export async function updateKaruteEntryTagsAction(
  entryId: string,
  tags: string[]
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await updateKaruteEntry({ id: entryId, tags })
  if (!result.success) throw new Error(result.error)

  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ============================================================================
// RECORDING SESSION ACTIONS
// ============================================================================

/**
 * Create a new recording session.
 *
 * @param input - Recording session creation input
 * @returns Success status with the created session ID
 * @throws Error if not authenticated or creation fails
 */
export async function createRecordingSessionAction(input: CreateRecordingSessionInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await createRecordingSession(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Update an existing recording session.
 *
 * @param input - Recording session update input (must include id)
 * @returns Success status with the updated session ID
 * @throws Error if not authenticated or update fails
 */
export async function updateRecordingSessionAction(input: UpdateRecordingSessionInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await updateRecordingSession(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true, id: result.data.id }
}

/**
 * Delete a recording session and its associated audio.
 *
 * @param id - UUID of the recording session to delete
 * @returns Success status
 * @throws Error if not authenticated or deletion fails
 */
export async function deleteRecordingSessionAction(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await deleteRecordingSession(id)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/[locale]/admin/dashboard', 'page')
  return { success: true }
}
