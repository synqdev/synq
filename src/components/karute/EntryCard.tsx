'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from './ConfidenceBadge'
import {
  updateKaruteEntryAction,
  deleteKaruteEntryAction,
} from '@/app/actions/karute'

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
}

interface EntryCardProps {
  entry: KaruteEntryData
  onHover: (segmentIndices: number[]) => void
  onLeave: () => void
  onUpdate: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const categoryColors: Record<string, string> = {
  SYMPTOM: 'bg-red-100 text-red-700',
  TREATMENT: 'bg-blue-100 text-blue-700',
  BODY_AREA: 'bg-purple-100 text-purple-700',
  PREFERENCE: 'bg-pink-100 text-pink-700',
  LIFESTYLE: 'bg-teal-100 text-teal-700',
  NEXT_VISIT: 'bg-indigo-100 text-indigo-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

const categoryLabels: Record<string, string> = {
  SYMPTOM: '症状',
  TREATMENT: '施術',
  BODY_AREA: '部位',
  PREFERENCE: '好み',
  LIFESTYLE: '生活習慣',
  NEXT_VISIT: '次回予約',
  OTHER: 'その他',
}

const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  value,
  label,
}))

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Individual entry card with category badge, content, confidence,
 * original quote, inline editing, and delete support.
 */
export function EntryCard({ entry, onHover, onLeave, onUpdate }: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [editCategory, setEditCategory] = useState(entry.category)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateKaruteEntryAction({
        id: entry.id,
        content: editContent,
        category: editCategory as 'SYMPTOM' | 'TREATMENT' | 'BODY_AREA' | 'PREFERENCE' | 'LIFESTYLE' | 'NEXT_VISIT' | 'OTHER',
      })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update entry', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('このエントリを削除しますか？')) return
    setIsDeleting(true)
    try {
      await deleteKaruteEntryAction(entry.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete entry', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setEditContent(entry.content)
    setEditCategory(entry.category)
    setIsEditing(false)
  }

  const colorClass = categoryColors[entry.category] || categoryColors.OTHER

  return (
    <div
      className="rounded-lg border border-secondary-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
      onMouseEnter={() => onHover(entry.segmentIndices)}
      onMouseLeave={onLeave}
    >
      {/* Header: category badge + confidence + delete */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {categoryLabels[entry.category] || entry.category}
          </span>
          <ConfidenceBadge confidence={entry.confidence} />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {isDeleting ? '...' : '削除'}
        </button>
      </div>

      {/* Content: display or edit mode */}
      {isEditing ? (
        <div className="space-y-2">
          <Select
            options={categoryOptions}
            value={editCategory}
            onChange={setEditCategory}
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg border border-secondary-200 p-2 text-sm focus:border-primary-500 focus:outline-none"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={isSaving}>
              保存
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <p
          className="cursor-pointer text-sm text-secondary-800 hover:bg-secondary-50 rounded p-1 -m-1"
          onClick={() => setIsEditing(true)}
        >
          {entry.content}
        </p>
      )}

      {/* Original quote */}
      {entry.originalQuote && (
        <blockquote className="mt-2 border-l-2 border-secondary-200 pl-2 text-xs italic text-gray-400">
          {entry.originalQuote}
        </blockquote>
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-secondary-100 px-2 py-0.5 text-xs text-secondary-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
