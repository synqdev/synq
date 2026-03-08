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
import { uploadRecording, deleteRecording, ALLOWED_RECORDING_TYPES } from '@/lib/storage/recording-storage'
import { updateRecordingSession } from '@/lib/services/recording.service'

const ALLOWED_TYPES: readonly string[] = ALLOWED_RECORDING_TYPES
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const recordingSessionId = formData.get('recordingSessionId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (typeof recordingSessionId !== 'string' || !recordingSessionId) {
    return NextResponse.json({ error: 'recordingSessionId is required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const uploadResult = await uploadRecording(recordingSessionId, file)

    const sessionResult = await updateRecordingSession({
      id: recordingSessionId,
      audioStoragePath: uploadResult.path,
    })

    if (!sessionResult.success) {
      // Roll back the uploaded file to avoid orphaned storage objects
      try {
        await deleteRecording(uploadResult.path)
      } catch (cleanupError) {
        console.error('[recordings/upload] Failed to clean up orphaned file', {
          path: uploadResult.path,
          cleanupError,
        })
      }
      return NextResponse.json({ error: sessionResult.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, path: uploadResult.path })
  } catch (error) {
    console.error('[recordings/upload] Upload failed', { error, recordingSessionId })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
