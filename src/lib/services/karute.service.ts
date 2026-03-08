/**
 * Karute Service
 *
 * CRUD operations for KaruteRecord and KaruteEntry entities.
 * All functions return Result<T> discriminated unions and validate
 * inputs with Zod schemas before database operations.
 *
 * Error handling: Sentry capture + console logging for production monitoring.
 */

import { prisma } from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import {
  createKaruteRecordSchema,
  updateKaruteRecordSchema,
  createKaruteEntrySchema,
  updateKaruteEntrySchema,
  type CreateKaruteRecordInput,
  type UpdateKaruteRecordInput,
  type CreateKaruteEntryInput,
  type UpdateKaruteEntryInput,
} from '@/lib/validations/karute';
import { deleteRecording } from '@/lib/storage/recording-storage';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for karute operations (discriminated union).
 * Uses generic `data` property since this service handles multiple entity types.
 */
export type KaruteResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * KaruteRecord with related entries and associations.
 */
export type KaruteRecordWithEntries = Prisma.KaruteRecordGetPayload<{
  include: {
    entries: true;
    customer: true;
    worker: true;
    booking: true;
    recordingSessions: true;
  };
}>;

/**
 * KaruteRecord with entries for list queries (without recording sessions).
 */
type KaruteRecordListItem = Prisma.KaruteRecordGetPayload<{
  include: {
    entries: true;
    worker: true;
    booking: true;
  };
}>;

// ============================================================================
// HELPERS
// ============================================================================

function captureKaruteError(error: unknown, context: Record<string, unknown>) {
  Sentry.captureException(error);
  console.error('[karute.service] operation failed', { error, ...context });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function formatValidationErrors(issues: { message: string }[]): string {
  return issues.map((i) => i.message).join(', ');
}

// ============================================================================
// KARUTE RECORD CRUD
// ============================================================================

const recordDetailInclude = {
  entries: true,
  customer: true,
  worker: true,
  booking: true,
  recordingSessions: true,
} as const;

const recordListInclude = {
  entries: true,
  worker: true,
  booking: true,
} as const;

/**
 * Creates a new karute record.
 */
export async function createKaruteRecord(
  input: CreateKaruteRecordInput
): Promise<KaruteResult<KaruteRecordWithEntries>> {
  const parseResult = createKaruteRecordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const validated = parseResult.data;

  try {
    const record = await prisma.karuteRecord.create({
      data: {
        customerId: validated.customerId,
        workerId: validated.workerId,
        bookingId: validated.bookingId,
      },
      include: recordDetailInclude,
    });

    return { success: true, data: record };
  } catch (error) {
    captureKaruteError(error, { operation: 'createKaruteRecord', ...validated });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Gets a single karute record by ID with all relations.
 */
export async function getKaruteRecord(
  id: string
): Promise<KaruteResult<KaruteRecordWithEntries>> {
  try {
    const record = await prisma.karuteRecord.findUnique({
      where: { id },
      include: recordDetailInclude,
    });

    if (!record) {
      return { success: false, error: 'Karute record not found' };
    }

    return { success: true, data: record };
  } catch (error) {
    captureKaruteError(error, { operation: 'getKaruteRecord', id });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Gets all karute records for a customer, ordered by creation date (newest first).
 */
export async function getKaruteRecordsByCustomer(
  customerId: string
): Promise<KaruteResult<KaruteRecordListItem[]>> {
  try {
    const records = await prisma.karuteRecord.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: recordListInclude,
    });

    return { success: true, data: records };
  } catch (error) {
    captureKaruteError(error, { operation: 'getKaruteRecordsByCustomer', customerId });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Updates an existing karute record.
 */
export async function updateKaruteRecord(
  input: UpdateKaruteRecordInput
): Promise<KaruteResult<KaruteRecordWithEntries>> {
  const parseResult = updateKaruteRecordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const { id, ...data } = parseResult.data;

  try {
    const record = await prisma.karuteRecord.update({
      where: { id },
      data,
      include: recordDetailInclude,
    });

    return { success: true, data: record };
  } catch (error) {
    captureKaruteError(error, { operation: 'updateKaruteRecord', id });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Deletes a karute record and cleans up associated audio files.
 *
 * Audio cleanup is best-effort: failures are logged but do not prevent deletion.
 * Prisma cascade handles deleting entries and segments.
 */
export async function deleteKaruteRecord(
  id: string
): Promise<KaruteResult<{ id: string }>> {
  try {
    // Find record with recording sessions to get audio paths
    const record = await prisma.karuteRecord.findUnique({
      where: { id },
      include: { recordingSessions: true },
    });

    if (!record) {
      return { success: false, error: 'Karute record not found' };
    }

    // Collect audio paths before deletion
    const audioPaths = record.recordingSessions
      .map((s) => s.audioStoragePath)
      .filter((p): p is string => p !== null);

    // Delete record (cascades to entries and recording sessions via Prisma schema)
    await prisma.karuteRecord.delete({ where: { id } });

    // Best-effort cleanup of audio files from storage
    for (const path of audioPaths) {
      try {
        await deleteRecording(path);
      } catch (error) {
        console.warn('[karute.service] Failed to delete audio file', {
          recordId: id,
          path,
          error,
        });
      }
    }

    return { success: true, data: { id } };
  } catch (error) {
    captureKaruteError(error, { operation: 'deleteKaruteRecord', id });
    return { success: false, error: formatError(error) };
  }
}

// ============================================================================
// KARUTE ENTRY CRUD
// ============================================================================

/**
 * Creates a new karute entry.
 */
export async function createKaruteEntry(
  input: CreateKaruteEntryInput
): Promise<KaruteResult<Prisma.KaruteEntryGetPayload<object>>> {
  const parseResult = createKaruteEntrySchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const validated = parseResult.data;

  try {
    const entry = await prisma.karuteEntry.create({
      data: {
        karuteId: validated.karuteId,
        category: validated.category,
        content: validated.content,
        originalQuote: validated.originalQuote,
        confidence: validated.confidence,
      },
    });

    return { success: true, data: entry };
  } catch (error) {
    captureKaruteError(error, { operation: 'createKaruteEntry', karuteId: validated.karuteId });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Updates an existing karute entry.
 */
export async function updateKaruteEntry(
  input: UpdateKaruteEntryInput
): Promise<KaruteResult<Prisma.KaruteEntryGetPayload<object>>> {
  const parseResult = updateKaruteEntrySchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const { id, ...data } = parseResult.data;

  try {
    const entry = await prisma.karuteEntry.update({
      where: { id },
      data,
    });

    return { success: true, data: entry };
  } catch (error) {
    captureKaruteError(error, { operation: 'updateKaruteEntry', id });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Deletes a karute entry by ID.
 */
export async function deleteKaruteEntry(
  id: string
): Promise<KaruteResult<{ id: string }>> {
  try {
    await prisma.karuteEntry.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    captureKaruteError(error, { operation: 'deleteKaruteEntry', id });
    return { success: false, error: formatError(error) };
  }
}
