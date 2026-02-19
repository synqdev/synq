'use client'

import { useCallback, useRef, useState } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface IntakeRecord {
  id: string
  imageUrl: string | null
  signedUrl: string | null
  enteredBy: string
  enteredAt: string
  item: {
    title: string
    contentType: string
  }
}

interface IntakeUploadProps {
  customerId: string
  locale: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function getLocaleTag(locale: string) {
  return locale === 'ja' ? 'ja-JP' : 'en-US'
}

function getFileName(imageUrl: string | null) {
  if (!imageUrl) return 'Unknown'
  const parts = imageUrl.split('/')
  const filename = parts[parts.length - 1]
  // Remove timestamp prefix
  const dashIndex = filename.indexOf('-')
  return dashIndex > 0 ? filename.slice(dashIndex + 1) : filename
}

function isPdf(imageUrl: string | null) {
  return imageUrl?.toLowerCase().endsWith('.pdf') ?? false
}

export function IntakeUpload({ customerId, locale }: IntakeUploadProps) {
  const t = useTranslations('admin.customerDetail.intake')
  const tCommon = useTranslations('common')

  const { data, error, isLoading, mutate } = useSWR<{ records: IntakeRecord[] }>(
    `/api/admin/customers/${customerId}/intake`,
    fetcher
  )

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/customers/${customerId}/intake`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Upload failed')
      }

      mutate()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [customerId, mutate])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleDelete = useCallback(async (recordId: string) => {
    setDeleting(recordId)
    setDeleteError(null)
    try {
      const res = await fetch(
        `/api/admin/customers/${customerId}/intake?recordId=${recordId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Delete failed')
      mutate()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }, [customerId, mutate])

  const records = data?.records ?? []

  if (isLoading) {
    return (
      <div className="flex min-h-[100px] items-center justify-center">
        <Spinner size="md" className="text-primary-500" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-error-600">{tCommon('error')}</p>
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-secondary-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm text-secondary-600">{t('uploading')}</span>
          </div>
        ) : (
          <p className="text-sm text-secondary-500">{t('dropzone')}</p>
        )}
      </div>

      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}

      {deleteError && (
        <p className="text-sm text-red-600">{deleteError}</p>
      )}

      {/* File list */}
      {records.length === 0 ? (
        <p className="py-2 text-center text-sm text-secondary-400">{t('noFiles')}</p>
      ) : (
        <ul className="divide-y divide-secondary-100">
          {records.map((record) => (
            <li key={record.id} className="flex items-center gap-3 py-3">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-secondary-100 text-xs font-medium text-secondary-600">
                {isPdf(record.imageUrl) ? 'PDF' : 'IMG'}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                {record.signedUrl ? (
                  <a
                    href={record.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-primary-600 hover:underline"
                  >
                    {getFileName(record.imageUrl)}
                  </a>
                ) : (
                  <span className="block truncate text-sm font-medium text-secondary-700">
                    {getFileName(record.imageUrl)}
                  </span>
                )}
                <p className="text-xs text-secondary-400">
                  {new Date(record.enteredAt).toLocaleDateString(getLocaleTag(locale), {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                  {' · '}
                  {record.enteredBy}
                </p>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(record.id)}
                disabled={deleting === record.id}
                className="text-red-500 hover:text-red-700"
              >
                {deleting === record.id ? <Spinner size="sm" /> : tCommon('delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
