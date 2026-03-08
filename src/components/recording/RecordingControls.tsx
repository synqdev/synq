'use client';

/**
 * Recording Controls
 *
 * Renders contextual start/pause/resume/stop buttons based on recording status.
 * All labels are i18n-ready via useTranslations.
 */

import { useTranslations } from 'next-intl';

interface RecordingControlsProps {
  status: 'idle' | 'recording' | 'paused' | 'stopped';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function RecordingControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: RecordingControlsProps) {
  const t = useTranslations('admin.recording');

  if (status === 'stopped') {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {status === 'idle' && (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-block h-3 w-3 rounded-full bg-white" />
          {t('startRecording')}
        </button>
      )}

      {status === 'recording' && (
        <>
          <button
            type="button"
            onClick={onPause}
            disabled={disabled}
            className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('pauseRecording')}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={disabled}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('stopRecording')}
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button
            type="button"
            onClick={onResume}
            disabled={disabled}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('resumeRecording')}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={disabled}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('stopRecording')}
          </button>
        </>
      )}
    </div>
  );
}
