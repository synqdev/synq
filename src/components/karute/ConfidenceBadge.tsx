'use client'

interface ConfidenceBadgeProps {
  confidence: number
}

/**
 * Displays confidence score with a warning for low-confidence entries (< 0.7).
 */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence < 0.7) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
        title="低信頼度"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {Math.round(confidence * 100)}%
      </span>
    )
  }

  return (
    <span className="text-xs text-gray-400">
      {Math.round(confidence * 100)}%
    </span>
  )
}
