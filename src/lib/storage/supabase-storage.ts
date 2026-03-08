import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

const BUCKET = 'intake-forms'

export async function uploadIntakeForm(
  customerId: string,
  file: File
): Promise<{ path: string }> {
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const path = `${customerId}/${timestamp}-${safeName}`

  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  return { path: data.path }
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .createSignedUrl(path, 3600)

  if (error) throw new Error(`Failed to get URL: ${error.message}`)
  return data.signedUrl
}

export async function deleteIntakeForm(path: string): Promise<void> {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .remove([path])

  if (error) throw new Error(`Delete failed: ${error.message}`)
}
