'use client'

import { useEffect, useRef } from 'react'

interface TranscriptionSegmentData {
  id: string
  segmentIndex: number
  speakerLabel?: string | null
  content: string
  startMs: number
  endMs: number
}

interface TranscriptPanelProps {
  segments: TranscriptionSegmentData[]
  highlightedIndices: number[]
}

/**
 * Transcript display panel with segment highlighting.
 * Highlighted segments scroll into view when indices change.
 */
export function TranscriptPanel({ segments, highlightedIndices }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightedIndices.length === 0) return

    const firstIndex = highlightedIndices[0]
    const element = document.getElementById(`segment-${firstIndex}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedIndices])

  if (segments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-secondary-200 bg-secondary-50 p-8">
        <p className="text-sm text-gray-400">トランスクリプトがありません</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto rounded-lg border border-secondary-200 bg-white p-4 space-y-3"
    >
      {segments.map((segment) => {
        const isHighlighted = highlightedIndices.includes(segment.segmentIndex)
        return (
          <div
            key={segment.id}
            id={`segment-${segment.segmentIndex}`}
            className={`rounded-lg p-2 transition-colors ${
              isHighlighted ? 'bg-yellow-100' : ''
            }`}
          >
            {segment.speakerLabel && (
              <span className="mb-1 inline-block rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-600">
                話者 {segment.speakerLabel}
              </span>
            )}
            <p className="text-sm text-secondary-800">{segment.content}</p>
          </div>
        )
      })}
    </div>
  )
}
