/**
 * Recording Service
 *
 * CRUD operations for RecordingSession entities.
 * All functions return RecordingResult<T> discriminated unions and validate
 * inputs with Zod schemas before database operations.
 *
 * Handles audio storage cleanup on deletion (best-effort).
 */

import { prisma } from '@/lib/db/client';
import { withRLSContext } from '@/lib/db/rls-context';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import {
  createRecordingSessionSchema,
  updateRecordingSessionSchema,
  type CreateRecordingSessionInput,
  type UpdateRecordingSessionInput,
} from '@/lib/validations/karute';
import { deleteRecording } from '@/lib/storage/recording-storage';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for recording operations (discriminated union).
 */
export type RecordingResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * RecordingSession with transcription segments and associations.
 */
export type RecordingSessionWithSegments = Prisma.RecordingSessionGetPayload<{
  include: {
    segments: true;
    customer: true;
    worker: true;
    karuteRecord: true;
  };
}>;

// ============================================================================
// HELPERS
// ============================================================================

function captureRecordingError(error: unknown, context: Record<string, unknown>) {
  const sanitized = { operation: context.operation };
  Sentry.captureException(error, { extra: sanitized });
  console.error('[recording.service] operation failed', { operation: context.operation, error: formatError(error) });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function formatValidationErrors(issues: { message: string }[]): string {
  return issues.map((i) => i.message).join(', ');
}

// ============================================================================
// RECORDING SESSION CRUD
// ============================================================================

const sessionDetailInclude = {
  customer: true,
  worker: true,
  karuteRecord: true,
} as const;

const sessionWithSegmentsInclude = {
  segments: { orderBy: { segmentIndex: 'asc' as const } },
  customer: true,
  worker: true,
  karuteRecord: true,
} as const;

/**
 * Creates a new recording session.
 */
export async function createRecordingSession(
  input: CreateRecordingSessionInput
): Promise<RecordingResult<Prisma.RecordingSessionGetPayload<{ include: typeof sessionDetailInclude }>>> {
  const parseResult = createRecordingSessionSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const validated = parseResult.data;

  try {
    const session = await withRLSContext({ role: 'admin' }, () =>
      prisma.recordingSession.create({
        data: {
          customerId: validated.customerId,
          workerId: validated.workerId,
          karuteRecordId: validated.karuteRecordId,
          bookingId: validated.bookingId,
        },
        include: sessionDetailInclude,
      })
    );

    return { success: true, data: session };
  } catch (error) {
    captureRecordingError(error, { operation: 'createRecordingSession' });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Gets a single recording session by ID with transcription segments.
 */
export async function getRecordingSession(
  id: string
): Promise<RecordingResult<RecordingSessionWithSegments>> {
  try {
    const session = await withRLSContext({ role: 'admin' }, () =>
      prisma.recordingSession.findUnique({
        where: { id },
        include: sessionWithSegmentsInclude,
      })
    );

    if (!session) {
      return { success: false, error: 'Recording session not found' };
    }

    return { success: true, data: session };
  } catch (error) {
    captureRecordingError(error, { operation: 'getRecordingSession' });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Updates an existing recording session.
 */
export async function updateRecordingSession(
  input: UpdateRecordingSessionInput
): Promise<RecordingResult<Prisma.RecordingSessionGetPayload<{ include: typeof sessionDetailInclude }>>> {
  const parseResult = updateRecordingSessionSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: formatValidationErrors(parseResult.error.issues) };
  }

  const { id, ...data } = parseResult.data;

  try {
    const session = await withRLSContext({ role: 'admin' }, () =>
      prisma.recordingSession.update({
        where: { id },
        data,
        include: sessionDetailInclude,
      })
    );

    return { success: true, data: session };
  } catch (error) {
    captureRecordingError(error, { operation: 'updateRecordingSession' });
    return { success: false, error: formatError(error) };
  }
}

/**
 * Deletes a recording session and cleans up audio from storage.
 *
 * Audio cleanup is best-effort: failures are logged but do not prevent deletion.
 * Prisma cascade handles deleting transcription segments.
 */
export async function deleteRecordingSession(
  id: string
): Promise<RecordingResult<{ id: string }>> {
  try {
    // Find session to get audio path for cleanup
    const session = await withRLSContext({ role: 'admin' }, () =>
      prisma.recordingSession.findUnique({ where: { id } })
    );

    if (!session) {
      return { success: false, error: 'Recording session not found' };
    }

    const audioStoragePath = session.audioStoragePath;

    // Delete session (cascades to segments via Prisma schema)
    await withRLSContext({ role: 'admin' }, () =>
      prisma.recordingSession.delete({ where: { id } })
    );

    // Best-effort cleanup of audio file from storage
    if (audioStoragePath) {
      try {
        await deleteRecording(audioStoragePath);
      } catch (error) {
        console.warn('[recording.service] Failed to delete audio file', {
          sessionId: id,
          path: audioStoragePath,
          error,
        });
      }
    }

    return { success: true, data: { id } };
  } catch (error) {
    captureRecordingError(error, { operation: 'deleteRecordingSession' });
    return { success: false, error: formatError(error) };
  }
}
