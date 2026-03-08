'use client';

/**
 * Recording Timer
 *
 * Displays elapsed recording time in MM:SS format.
 * Pure presentational component with monospace font for stable width.
 */

interface RecordingTimerProps {
  seconds: number;
}

export function RecordingTimer({ seconds }: RecordingTimerProps) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formatted = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  return (
    <div className="text-center">
      <span className="font-mono text-4xl font-semibold text-slate-100 tabular-nums">
        {formatted}
      </span>
    </div>
  );
}
