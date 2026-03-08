import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    // This module performs privileged server-side storage operations.
    // Require the service role key — never fall back to the anon key
    // to avoid silently operating with reduced permissions.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage operations'
      )
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

const BUCKET = 'recordings'

export async function uploadRecording(
  recordingId: string,
  file: File
): Promise<{ path: string }> {
  const path = `${recordingId}.webm`

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
