import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase service-role key (SUPABASE_SERVICE_ROLE_KEY) is required for server-side admin operations')
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

const BUCKET = 'recordings'

/** Allowed audio MIME types for recording uploads. */
export const ALLOWED_RECORDING_TYPES = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'] as const

/** Maps MIME type to file extension for storage path construction. */
const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
}

/** Regex for validating recording IDs (UUID format). Prevents path traversal attacks. */
const SAFE_RECORDING_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function uploadRecording(
  recordingId: string,
  file: File
): Promise<{ path: string }> {
  if (!SAFE_RECORDING_ID_RE.test(recordingId)) {
    throw new Error('Invalid recording ID format')
  }

  if (!(ALLOWED_RECORDING_TYPES as readonly string[]).includes(file.type)) {
    throw new Error(`Unsupported recording MIME type: ${file.type || 'unknown'}`)
  }

  const ext = MIME_TO_EXT[file.type] ?? 'webm'
  const path = `${recordingId}.${ext}`

  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  return { path: data.path }
}

export async function getRecordingSignedUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error) throw new Error(`Failed to get URL: ${error.message}`)
  return data.signedUrl
}

export async function deleteRecording(path: string): Promise<void> {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .remove([path])

  if (error) throw new Error(`Delete failed: ${error.message}`)
}
