'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { EntryCard } from './EntryCard'
import { EntryForm } from './EntryForm'
import { TranscriptPanel } from './TranscriptPanel'
import { ApprovalControls } from './ApprovalControls'

// ============================================================================
// TYPES
// ============================================================================

interface KaruteEntryData {
  id: string
  category: string
  content: string
  originalQuote?: string | null
  confidence: number
  tags: string[]
  segmentIndices: number[]
  displayOrder: number
}

interface TranscriptionSegmentData {
  id: string
  segmentIndex: number
  speakerLabel?: string | null
  content: string
  startMs: number
  endMs: number
}

interface RecordingSessionData {
  id: string
  segments: TranscriptionSegmentData[]
}

interface KaruteRecordData {
  id: string
  aiSummary?: string | null
  status: string
  createdAt: string
  entries: KaruteEntryData[]
  customer: { id: string; name: string }
  worker: { id: string; name: string }
  booking?: { id: string; startsAt: string } | null
  recordingSessions: RecordingSessionData[]
}

// ============================================================================
// HELPERS
// ============================================================================

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `Failed to fetch: ${r.status}`)
  }
  return r.json()
}

// ============================================================================
// COMPONENT
// ============================================================================

interface KaruteEditorProps {
  recordId: string
  locale: string
}

/**
 * Main karute editing interface with side-by-side transcript/entries layout.
 * Fetches record data via SWR with revalidateOnFocus disabled to avoid
 * clobbering inline edits.
 */
export function KaruteEditor({ recordId, locale }: KaruteEditorProps) {
  const t = useTranslations('admin.karuteEditor')
  const { data, error, isLoading, mutate } = useSWR<KaruteRecordData>(
    `/api/admin/karute/${recordId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const [activeSegmentIndices, setActiveSegmentIndices] = useState<number[]>([])
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyError, setClassifyError] = useState<string | null>(null)

  const handleUpdate = () => {
    mutate()
  }

  const handleClassify = async () => {
    if (!data) return

    // If entries exist, confirm re-classification
    if (data.entries.length > 0) {
      const confirmed = confirm(t('reclassifyConfirm'))
      if (!confirmed) return
    }

    setIsClassifying(true)
    setClassifyError(null)
    try {
      const res = await fetch(`/api/admin/karute/${recordId}/classify`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Classification failed: ${res.status}`)
      }
      mutate()
    } catch (error) {
      console.error('Classification failed', error)
      setClassifyError(error instanceof Error ? error.message : 'Classification failed')
    } finally {
      setIsClassifying(false)
    }
  }

  // Collect all segments from all recording sessions
  const allSegments = useMemo(
    () => data?.recordingSessions.flatMap((s) => s.segments) ?? [],
    [data?.recordingSessions]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500">
          {error?.message || 'Failed to load karute record'}
        </p>
      </div>
    )
  }

  const dateStr = data.booking?.startsAt
    ? new Date(data.booking.startsAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP')
    : new Date(data.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP')

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-sm text-secondary-600">
            <span>{t('customer')}: <strong>{data.customer.name}</strong></span>
            <span>{t('practitioner')}: <strong>{data.worker.name}</strong></span>
            <span>{t('date')}: <strong>{dateStr}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/karute/${recordId}/export?format=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded border border-secondary-300 px-2 py-1 text-xs text-secondary-600 transition-colors hover:bg-secondary-50"
            >
              {locale === 'en' ? 'Export PDF' : 'PDF出力'}
            </a>
            <a
              href={`/api/admin/karute/${recordId}/export?format=text`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded border border-secondary-300 px-2 py-1 text-xs text-secondary-600 transition-colors hover:bg-secondary-50"
            >
              {locale === 'en' ? 'Export Text' : 'テキスト出力'}
            </a>
          </div>
        </div>
        <ApprovalControls
          status={data.status as 'DRAFT' | 'REVIEW' | 'APPROVED'}
          recordId={recordId}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Summary */}
      {data.aiSummary && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-500">
            {t('summary')}
          </h3>
          <p className="text-sm text-secondary-700">{data.aiSummary}</p>
        </div>
      )}

      {/* Side-by-side layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Transcript */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-secondary-700">
            {t('transcript')}
          </h3>
          <div className="max-h-[600px]">
            <TranscriptPanel
              segments={allSegments}
              highlightedIndices={activeSegmentIndices}
            />
          </div>
        </div>

        {/* Right: Entries */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary-700">
              {t('entries')}
              {data.entries.length > 0 && (
                <span className="ml-1 text-secondary-400">({data.entries.length})</span>
              )}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClassify}
              loading={isClassifying}
            >
              {isClassifying
                ? t('classifying')
                : data.entries.length > 0
                  ? t('reclassify')
                  : t('classify')
              }
            </Button>
          </div>

          {classifyError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{classifyError}</p>
          )}

          {data.entries.length === 0 ? (
            <p className="mb-4 text-sm text-gray-400">
              {t('noEntries')}
            </p>
          ) : (
            <div className="mb-4 space-y-3">
              {data.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onHover={(indices) => setActiveSegmentIndices(indices)}
                  onLeave={() => setActiveSegmentIndices([])}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}

          <EntryForm recordId={recordId} onAdd={handleUpdate} />
        </div>
      </div>
    </div>
  )
}
