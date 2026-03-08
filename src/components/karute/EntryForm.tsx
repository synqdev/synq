'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createKaruteEntryAction } from '@/app/actions/karute'
import { CATEGORY_KEYS } from './constants'
import type { KaruteEntryCategory } from './constants'

interface EntryFormProps {
  recordId: string
  onAdd: () => void
}

/**
 * Collapsible form for manually adding new karute entries.
 * Starts as a "+ Add Entry" button, expands to show the form.
 */
export function EntryForm({ recordId, onAdd }: EntryFormProps) {
  const t = useTranslations('admin.karuteEditor')
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState('SYMPTOM')
  const [content, setContent] = useState('')
  const [originalQuote, setOriginalQuote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categoryOptions = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: t(`categories.${key}` as Parameters<typeof t>[0]),
  }))

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await createKaruteEntryAction({
        karuteId: recordId,
        category: category as KaruteEntryCategory,
        content: content.trim(),
        originalQuote: originalQuote.trim() || undefined,
        confidence: 1.0,
      })
      setContent('')
      setOriginalQuote('')
      setCategory('SYMPTOM')
      setIsOpen(false)
      onAdd()
    } catch (error) {
      console.error('Failed to create entry', error)
      setErrorMessage(error instanceof Error ? error.message : t('addEntry') + ' failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-secondary-300 p-3 text-sm text-secondary-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        + {t('addEntry')}
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-3 space-y-3">
      <Select
        options={categoryOptions}
        value={category}
        onChange={setCategory}
        label={t('category')}
      />
      <div>
        <label className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-black">
          {t('content')}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border-2 border-black p-2 text-sm focus:border-primary-500 focus:outline-none"
          rows={3}
          placeholder={t('content') + '...'}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-black">
          {t('originalQuote')}
        </label>
        <input
          type="text"
          value={originalQuote}
          onChange={(e) => setOriginalQuote(e.target.value)}
          className="w-full rounded-lg border-2 border-black p-2 text-sm focus:border-primary-500 focus:outline-none"
          placeholder={t('originalQuote') + '...'}
        />
      </div>
      {errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} loading={isSubmitting}>
          {t('addEntry')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
