'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createKaruteEntryAction } from '@/app/actions/karute'

interface EntryFormProps {
  recordId: string
  onAdd: () => void
}

const categoryOptions = [
  { value: 'SYMPTOM', label: '症状' },
  { value: 'TREATMENT', label: '施術' },
  { value: 'BODY_AREA', label: '部位' },
  { value: 'PREFERENCE', label: '好み' },
  { value: 'LIFESTYLE', label: '生活習慣' },
  { value: 'NEXT_VISIT', label: '次回予約' },
  { value: 'OTHER', label: 'その他' },
]

/**
 * Collapsible form for manually adding new karute entries.
 * Starts as a "+ Add Entry" button, expands to show the form.
 */
export function EntryForm({ recordId, onAdd }: EntryFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState('SYMPTOM')
  const [content, setContent] = useState('')
  const [originalQuote, setOriginalQuote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      await createKaruteEntryAction({
        karuteId: recordId,
        category: category as 'SYMPTOM' | 'TREATMENT' | 'BODY_AREA' | 'PREFERENCE' | 'LIFESTYLE' | 'NEXT_VISIT' | 'OTHER',
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
        + エントリを追加
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-3 space-y-3">
      <Select
        options={categoryOptions}
        value={category}
        onChange={setCategory}
        label="カテゴリ"
      />
      <div>
        <label className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-black">
          内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border-2 border-black p-2 text-sm focus:border-primary-500 focus:outline-none"
          rows={3}
          placeholder="エントリの内容を入力..."
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-black">
          原文引用（任意）
        </label>
        <input
          type="text"
          value={originalQuote}
          onChange={(e) => setOriginalQuote(e.target.value)}
          className="w-full rounded-lg border-2 border-black p-2 text-sm focus:border-primary-500 focus:outline-none"
          placeholder="トランスクリプトからの引用..."
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} loading={isSubmitting}>
          追加
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          キャンセル
        </Button>
      </div>
    </div>
  )
}
