'use client'

import { useState } from 'react'
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
  const { data, error, isLoading, mutate } = useSWR<KaruteRecordData>(
    `/api/admin/karute/${recordId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const [activeSegmentIndices, setActiveSegmentIndices] = useState<number[]>([])
  const [isClassifying, setIsClassifying] = useState(false)

  const handleUpdate = () => {
    mutate()
  }

  const handleClassify = async () => {
    if (!data) return

    // If entries exist, confirm re-classification
    if (data.entries.length > 0) {
      const confirmed = confirm(
        locale === 'en'
          ? 'Existing entries will be deleted. Reclassify?'
          : '既存のエントリが削除されます。再分類しますか？'
      )
      if (!confirmed) return
    }

    setIsClassifying(true)
    try {
      const res = await fetch(`/api/admin/karute/${recordId}/classify`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Classification failed')
      mutate()
    } catch (error) {
      console.error('Classification failed', error)
    } finally {
      setIsClassifying(false)
    }
  }

  // Collect all segments from all recording sessions
  const allSegments = data?.recordingSessions.flatMap((s) => s.segments) ?? []

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
          {locale === 'en' ? 'Failed to load karute record' : 'カルテの読み込みに失敗しました'}
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
            <span>{locale === 'en' ? 'Customer' : '顧客'}: <strong>{data.customer.name}</strong></span>
            <span>{locale === 'en' ? 'Practitioner' : '施術者'}: <strong>{data.worker.name}</strong></span>
            <span>{locale === 'en' ? 'Date' : '日付'}: <strong>{dateStr}</strong></span>
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
          status={data.status}
          recordId={recordId}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Summary */}
      {data.aiSummary && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-500">
            {locale === 'en' ? 'Summary' : 'サマリー'}
          </h3>
          <p className="text-sm text-secondary-700">{data.aiSummary}</p>
        </div>
      )}

      {/* Side-by-side layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Transcript */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-secondary-700">
            {locale === 'en' ? 'Transcript' : 'トランスクリプト'}
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
              {locale === 'en' ? 'Entries' : 'エントリ'}
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
                ? (locale === 'en' ? 'Classifying...' : '分類中...')
                : data.entries.length > 0
                  ? (locale === 'en' ? 'Reclassify' : '再分類')
                  : (locale === 'en' ? 'Run AI Classification' : 'AI分類を実行')
              }
            </Button>
          </div>

          {data.entries.length === 0 ? (
            <p className="mb-4 text-sm text-gray-400">
              {locale === 'en' ? 'No entries yet' : 'エントリがありません'}
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
