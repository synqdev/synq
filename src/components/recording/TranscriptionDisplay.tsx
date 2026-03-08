'use client';

/**
 * Transcription Display
 *
 * Renders a list of transcription segments with speaker labels,
 * text content, and timestamp ranges (MM:SS - MM:SS).
 */

import { useTranslations } from 'next-intl';

interface TranscriptionSegment {
  segmentIndex: number;
  speakerLabel: string | null;
  content: string;
  startMs: number;
  endMs: number;
}

interface TranscriptionDisplayProps {
  segments: TranscriptionSegment[];
}

const SPEAKER_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-purple-100 text-purple-800',
  D: 'bg-amber-100 text-amber-800',
  E: 'bg-rose-100 text-rose-800',
};

function getSpeakerColor(label: string | null): string {
  if (!label) return 'bg-slate-100 text-slate-600';
  // Extract last token for color mapping (e.g., "Speaker A" -> "A", "Speaker 1" -> "A")
  const lastToken = label.trim().split(/\s+/).pop() ?? '';
  const NUMERIC_TO_LETTER = ['A', 'B', 'C', 'D', 'E'];
  const numericIndex = parseInt(lastToken, 10);
  const key = !isNaN(numericIndex) && numericIndex >= 1
    ? (NUMERIC_TO_LETTER[numericIndex - 1] ?? lastToken.toUpperCase())
    : lastToken.toUpperCase();
  return SPEAKER_COLORS[key] || 'bg-slate-100 text-slate-600';
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function TranscriptionDisplay({ segments }: TranscriptionDisplayProps) {
  const t = useTranslations('admin.recording');

  if (segments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-400">
        {t('noSegments')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <div
          key={segment.segmentIndex}
          className="flex gap-3 rounded-lg bg-slate-800/50 p-3"
        >
          <div className="flex-shrink-0">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getSpeakerColor(segment.speakerLabel)}`}
            >
              {segment.speakerLabel
                ? t('speaker', { label: segment.speakerLabel })
                : t('speaker', { label: '?' })}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-slate-200">
              {segment.content}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatMs(segment.startMs)} - {formatMs(segment.endMs)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
