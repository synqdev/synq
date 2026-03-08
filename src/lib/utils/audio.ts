/**
 * Audio Utilities
 *
 * Browser audio recording helpers: MIME type detection and constants.
 */

/**
 * Ordered list of MIME types to try for MediaRecorder.
 * Preference: WebM+Opus (Chrome/Firefox) > WebM > MP4 (Safari) > Ogg.
 */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const;

/**
 * Interval in milliseconds between MediaRecorder ondataavailable events.
 */
export const AUDIO_CHUNK_INTERVAL = 1000;

/**
 * Detects the first supported audio MIME type for MediaRecorder.
 *
 * @returns The first supported MIME type string
 * @throws Error if no supported MIME type is found
 */
export function getSupportedMimeType(): string {
  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  throw new Error(
    'No supported audio MIME type found. Recording is not available in this browser.'
  );
}
