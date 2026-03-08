'use client';

/**
 * Recording Panel
 *
 * Main orchestrating component for the recording UI.
 * Composes WaveformVisualizer, RecordingTimer, RecordingControls,
 * and TranscriptionDisplay. Manages the full pipeline:
 * create session -> record -> upload -> transcribe -> display segments.
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAudioRecorder, type RecordingErrorCode } from '@/hooks/useAudioRecorder';
import { createRecordingSessionAction } from '@/app/actions/karute';
import { Spinner } from '@/components/ui';
import { WaveformVisualizer } from './WaveformVisualizer';
import { RecordingTimer } from './RecordingTimer';
import { RecordingControls } from './RecordingControls';
import { TranscriptionDisplay } from './TranscriptionDisplay';

interface TranscriptionSegment {
  segmentIndex: number;
  speakerLabel: string | null;
  content: string;
  startMs: number;
  endMs: number;
}

interface RecordingPanelProps {
  customerId: string;
  workerId: string;
  karuteRecordId?: string;
  bookingId?: string;
}

export function RecordingPanel({
  customerId,
  workerId,
  karuteRecordId,
  bookingId,
}: RecordingPanelProps) {
  const t = useTranslations('admin.recording');
  const recorder = useAudioRecorder();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSegments, setTranscriptionSegments] = useState<
    TranscriptionSegment[]
  >([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [isTranscriptionComplete, setIsTranscriptionComplete] = useState(false);

  const isProcessing = isStarting || isUploading || isTranscribing;

  function translateRecorderError(code: RecordingErrorCode | null): string | null {
    if (!code) return null;
    switch (code) {
      case 'ERROR_PERMISSION': return t('errorPermission');
      case 'ERROR_NO_MIC': return t('errorNoMic');
      case 'ERROR_UNKNOWN': return t('errorMic');
    }
  }

  const handleStart = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    setPipelineError(null);
    setIsTranscriptionComplete(false);
    setTranscriptionSegments([]);

    let recordingStarted = false;
    try {
      // Start mic first — avoids orphan DB sessions on permission failure
      await recorder.startRecording();
      recordingStarted = true;

      // Create recording session in DB only after mic is confirmed
      const result = await createRecordingSessionAction({
        customerId,
        workerId,
        karuteRecordId,
        bookingId,
      });
      setSessionId(result.id);
    } catch (err) {
      if (recordingStarted) {
        // DB creation failed after recording started — surface as pipeline error
        setPipelineError(
          err instanceof Error ? err.message : 'Failed to start recording'
        );
      }
      // If !recordingStarted, recorder.error is already set with an error code
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, customerId, workerId, karuteRecordId, bookingId, recorder]);

  const handleStop = useCallback(async () => {
    if (!sessionId) return;

    try {
      setPipelineError(null);

      // Stop recording and get blob
      const blob = await recorder.stopRecording();

      // Upload audio
      setIsUploading(true);
      const formData = new FormData();
      formData.append(
        'file',
        new File([blob], `${sessionId}.webm`, { type: blob.type })
      );
      formData.append('recordingSessionId', sessionId);

      const uploadRes = await fetch('/api/admin/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || t('errorUpload'));
      }

      setIsUploading(false);

      // Trigger transcription
      setIsTranscribing(true);
      const transcribeRes = await fetch('/api/admin/recordings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingSessionId: sessionId }),
      });

      if (!transcribeRes.ok) {
        const transcribeErr = await transcribeRes.json();
        throw new Error(transcribeErr.error || t('errorTranscription'));
      }

      // Fetch transcription segments
      const segmentsRes = await fetch(
        `/api/admin/recordings/${sessionId}/segments`
      );

      if (!segmentsRes.ok) {
        throw new Error(t('errorTranscription'));
      }

      const segmentsData = await segmentsRes.json();
      setTranscriptionSegments(segmentsData.segments || []);
      setIsTranscribing(false);
      setIsTranscriptionComplete(true);
    } catch (err) {
      setIsUploading(false);
      setIsTranscribing(false);
      setPipelineError(
        err instanceof Error ? err.message : 'Pipeline error occurred'
      );
    }
  }, [sessionId, recorder, t]);

  const handleNewRecording = useCallback(() => {
    recorder.resetRecorder();
    setSessionId(null);
    setPipelineError(null);
    setTranscriptionSegments([]);
    setIsTranscriptionComplete(false);
  }, [recorder]);

  return (
    <div className="rounded-xl bg-slate-900 p-6">
      {/* Timer */}
      <div className="mb-4">
        <RecordingTimer seconds={recorder.elapsedSeconds} />
      </div>

      {/* Waveform */}
      <div className="mb-4">
        <WaveformVisualizer
          analyserNode={recorder.analyserNode}
          isActive={recorder.status === 'recording'}
        />
      </div>

      {/* Controls */}
      <div className="mb-4">
        <RecordingControls
          status={recorder.status}
          onStart={handleStart}
          onPause={recorder.pauseRecording}
          onResume={recorder.resumeRecording}
          onStop={handleStop}
          onNewRecording={handleNewRecording}
          disabled={isProcessing}
        />
      </div>

      {/* Processing status */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Spinner size="sm" />
          <span className="text-sm text-slate-300">{t('uploading')}</span>
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Spinner size="sm" />
          <span className="text-sm text-slate-300">{t('transcribing')}</span>
        </div>
      )}

      {/* Recording complete indicator (hidden once transcription results are ready) */}
      {recorder.status === 'stopped' && !isProcessing && !pipelineError && !isTranscriptionComplete && (
        <p className="py-2 text-center text-sm font-medium text-teal-400">
          {t('recordingComplete')}
        </p>
      )}

      {/* Error display */}
      {(pipelineError || recorder.error) && (
        <p className="py-2 text-center text-sm text-red-400">
          {pipelineError ?? translateRecorderError(recorder.error)}
        </p>
      )}

      {/* Transcription results */}
      {isTranscriptionComplete && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <h3 className="mb-3 text-sm font-medium text-slate-300">
            {t('transcriptionComplete')}
          </h3>
          <TranscriptionDisplay segments={transcriptionSegments} />
        </div>
      )}
    </div>
  );
}
