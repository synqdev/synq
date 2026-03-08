/**
 * Audio Upload API Route
 *
 * POST /api/admin/recordings/upload
 *
 * Accepts audio file uploads with MIME type and size validation.
 * Uploads to Supabase Storage and persists the storage path on the recording session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { uploadRecording, deleteRecording } from '@/lib/storage/recording-storage'
import { updateRecordingSession } from '@/lib/services/recording.service'

// Include codec-qualified variants that browsers emit (e.g. audio/webm;codecs=opus)
const ALLOWED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/wav',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const recordingSessionId = formData.get('recordingSessionId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!recordingSessionId) {
    return NextResponse.json({ error: 'recordingSessionId is required' }, { status: 400 })
  }

  // Accept both exact match and base MIME type (strip codec params for comparison)
  const baseMimeType = file.type.split(';')[0].trim()
  const isAllowed = ALLOWED_TYPES.includes(file.type) || ALLOWED_TYPES.includes(baseMimeType)
  if (!isAllowed) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const result = await uploadRecording(recordingSessionId, file)

    try {
      await updateRecordingSession({
        id: recordingSessionId,
        audioStoragePath: result.path,
      })
    } catch (dbError) {
      // DB write failed after storage upload — clean up orphaned blob
      await deleteRecording(result.path).catch((cleanupError) => {
        console.error('[recordings/upload] Cleanup of orphaned blob failed', {
          cleanupError,
          path: result.path,
        })
      })
      throw dbError
    }

    return NextResponse.json({ success: true, path: result.path })
  } catch (error) {
    console.error('[recordings/upload] Upload failed', { error, recordingSessionId })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
