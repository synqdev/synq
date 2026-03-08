'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ConfidenceBadge } from './ConfidenceBadge'
import {
  updateKaruteEntryAction,
  deleteKaruteEntryAction,
} from '@/app/actions/karute'
import { categoryColors, CATEGORY_KEYS } from './constants'
import type { KaruteEntryCategory } from './constants'

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
// COMPONENT
// ============================================================================

/**
 * Individual entry card with category badge, content, confidence,
 * original quote, inline editing, and delete support.
 */
export function EntryCard({ entry, onHover, onLeave, onUpdate }: EntryCardProps) {
  const t = useTranslations('admin.karuteEditor')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [editCategory, setEditCategory] = useState(entry.category)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isMutating = isSaving || isDeleting

  const categoryOptions = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(`categories.${key}` as Parameters<typeof t>[0]),
  }))

  const categoryLabel = categoryOptions.find((opt) => opt.value === entry.category)?.label ?? entry.category

  const handleSave = async () => {
    if (isMutating) return
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await updateKaruteEntryAction({
        id: entry.id,
        content: editContent,
        category: editCategory as KaruteEntryCategory,
      })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update entry', error)
      setErrorMessage(error instanceof Error ? error.message : t('save') + ' failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isMutating) return
    if (!confirm(t('deleteConfirm'))) return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await deleteKaruteEntryAction(entry.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete entry', error)
      setErrorMessage(error instanceof Error ? error.message : t('delete') + ' failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setEditContent(entry.content)
    setEditCategory(entry.category)
    setErrorMessage(null)
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
            {categoryLabel}
          </span>
          <ConfidenceBadge confidence={entry.confidence} />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isMutating}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {isDeleting ? '...' : t('delete')}
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <p className="mb-2 text-xs text-red-600">{errorMessage}</p>
      )}

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
            <Button size="sm" onClick={handleSave} loading={isSaving} disabled={isMutating}>
              {t('save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isMutating}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded p-1 -m-1 text-left text-sm text-secondary-800 hover:bg-secondary-50 cursor-pointer"
          onClick={() => setIsEditing(true)}
        >
          {entry.content}
        </button>
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
