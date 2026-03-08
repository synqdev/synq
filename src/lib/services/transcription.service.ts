/**
 * Transcription Service
 *
 * Downloads audio from Supabase, sends to OpenAI gpt-4o-transcribe-diarize,
 * and stores resulting segments with speaker labels and timestamps.
 *
 * Status transitions: PROCESSING -> COMPLETED (or FAILED on error).
 * OpenAI client is created lazily to allow module import without API key.
 */

import { prisma } from '@/lib/db/client';
import * as Sentry from '@sentry/nextjs';
import { getRecordingSignedUrl } from '@/lib/storage/recording-storage';
import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for transcription operations (discriminated union).
 */
export type TranscriptionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Diarized transcription response shape from OpenAI.
 * The gpt-4o-transcribe-diarize model with response_format 'diarized_json'
 * returns an object with a speakers array containing labeled segments.
 */
interface DiarizedSegment {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
}

interface DiarizedResponse {
  speakers?: DiarizedSegment[];
  segments?: DiarizedSegment[];
}

// ============================================================================
// HELPERS
// ============================================================================

function captureTranscriptionError(
  error: unknown,
  context: Record<string, unknown>
) {
  Sentry.captureException(error);
  console.error('[transcription.service] operation failed', {
    error,
    ...context,
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ============================================================================
// TRANSCRIPTION
// ============================================================================

/**
 * Transcribes a recording session using OpenAI gpt-4o-transcribe-diarize.
 *
 * 1. Finds the recording session and validates it has audio
 * 2. Updates status to PROCESSING
 * 3. Downloads audio from Supabase via signed URL
 * 4. Sends to OpenAI for transcription with speaker diarization
 * 5. Stores resulting segments in TranscriptionSegment
 * 6. Updates status to COMPLETED
 *
 * On error, status is set to FAILED (best-effort).
 */
export async function transcribeRecording(
  recordingSessionId: string
): Promise<TranscriptionResult<{ segmentCount: number }>> {
  // 1. Find session
  const session = await prisma.recordingSession.findUnique({
    where: { id: recordingSessionId },
  });

  if (!session) {
    return { success: false, error: 'Recording session not found' };
  }

  if (!session.audioStoragePath) {
    return { success: false, error: 'Recording session has no audio file' };
  }

  try {
    // 2. Update status to PROCESSING
    await prisma.recordingSession.update({
      where: { id: recordingSessionId },
      data: { status: 'PROCESSING' },
    });

    // 3. Get signed URL and download audio
    const signedUrl = await getRecordingSignedUrl(session.audioStoragePath);
    const response = await fetch(signedUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioFile = new File(
      [arrayBuffer],
      `${recordingSessionId}.webm`,
      { type: 'audio/webm' }
    );

    // 4. Call OpenAI transcription
    const openai = createOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-transcribe-diarize',
      file: audioFile,
      language: 'ja',
      response_format: 'diarized_json',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // 5. Parse response — handle both 'speakers' and 'segments' fields defensively
    const diarized = transcription as unknown as DiarizedResponse;
    const rawSegments = diarized.speakers || diarized.segments || [];

    const segments = rawSegments.map(
      (segment: DiarizedSegment, index: number) => ({
        recordingId: recordingSessionId,
        segmentIndex: index,
        speakerLabel: segment.speaker || null,
        content: segment.text,
        startMs: Math.round(segment.start * 1000),
        endMs: Math.round(segment.end * 1000),
        language: 'ja',
      })
    );

    // 6. Store segments
    await prisma.transcriptionSegment.createMany({ data: segments });

    // 7. Update status to COMPLETED
    await prisma.recordingSession.update({
      where: { id: recordingSessionId },
      data: { status: 'COMPLETED' },
    });

    return { success: true, data: { segmentCount: segments.length } };
  } catch (error) {
    // Best-effort status update to FAILED
    try {
      await prisma.recordingSession.update({
        where: { id: recordingSessionId },
        data: { status: 'FAILED' },
      });
    } catch {
      // Ignore failure to update status
    }

    captureTranscriptionError(error, {
      operation: 'transcribeRecording',
      recordingSessionId,
    });
    return { success: false, error: formatError(error) };
  }
}
