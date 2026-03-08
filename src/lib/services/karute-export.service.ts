/**
 * Karute Export Service
 *
 * Generates PDF and plain text exports of karute records.
 * PDF uses @react-pdf/renderer with Noto Sans JP for Japanese text.
 */

import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db/client'
import {
  KaruteDocument,
  type KaruteDocumentData,
} from '@/components/karute/KaruteDocument'

// ============================================================================
// HELPERS
// ============================================================================

const categoryLabels: Record<string, string> = {
  SYMPTOM: '症状',
  TREATMENT: '施術',
  BODY_AREA: '部位',
  PREFERENCE: '好み',
  LIFESTYLE: '生活習慣',
  NEXT_VISIT: '次回予約',
  OTHER: 'その他',
}

const statusLabels: Record<string, string> = {
  DRAFT: '下書き',
  REVIEW: '確認中',
  APPROVED: '承認済',
}

function categoryLabel(category: string): string {
  return categoryLabels[category] || category
}

function statusLabel(status: string): string {
  return statusLabels[status] || status
}

interface EntryForExport {
  category: string
  content: string
  displayOrder: number
}

function groupByCategory(
  entries: EntryForExport[]
): Record<string, EntryForExport[]> {
  const groups: Record<string, EntryForExport[]> = {}
  for (const entry of entries) {
    if (!groups[entry.category]) {
      groups[entry.category] = []
    }
    groups[entry.category].push(entry)
  }
  return groups
}

// ============================================================================
// DATA FETCH
// ============================================================================

async function fetchRecordForExport(
  recordId: string
): Promise<KaruteDocumentData | null> {
  const record = await prisma.karuteRecord.findUnique({
    where: { id: recordId },
    include: {
      entries: { orderBy: { displayOrder: 'asc' } },
      customer: { select: { name: true } },
      worker: { select: { name: true } },
      booking: { select: { startsAt: true } },
    },
  })

  if (!record) return null

  return {
    id: record.id,
    status: record.status,
    aiSummary: record.aiSummary,
    createdAt: record.createdAt.toISOString(),
    entries: record.entries.map((e) => ({
      category: e.category,
      content: e.content,
      displayOrder: e.displayOrder,
    })),
    customer: { name: record.customer.name },
    worker: { name: record.worker.name },
    booking: record.booking
      ? { startsAt: record.booking.startsAt.toISOString() }
      : null,
  }
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Generates a PDF buffer for a karute record.
 */
export async function generateKarutePDF(
  recordId: string
): Promise<{ success: true; buffer: Buffer } | { success: false; error: string }> {
  try {
    const record = await fetchRecordForExport(recordId)
    if (!record) {
      return { success: false, error: 'Karute record not found' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(KaruteDocument, { record }) as any
    const buffer = await renderToBuffer(element)

    return { success: true, buffer: Buffer.from(buffer) }
  } catch (error) {
    console.error('[karute-export] PDF generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF generation failed',
    }
  }
}

// ============================================================================
// TEXT EXPORT
// ============================================================================

/**
 * Generates a formatted plain text export of a karute record.
 */
export async function generateKaruteText(
  recordId: string
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  try {
    const record = await fetchRecordForExport(recordId)
    if (!record) {
      return { success: false, error: 'Karute record not found' }
    }

    const dateStr = record.booking?.startsAt
      ? new Date(record.booking.startsAt).toLocaleDateString('ja-JP')
      : new Date(record.createdAt).toLocaleDateString('ja-JP')

    const lines: string[] = [
      '施術記録 / Treatment Record',
      '──────────────────────────',
      `日付: ${dateStr}`,
      `施術者: ${record.worker.name}`,
      `患者: ${record.customer.name}`,
      `ステータス: ${statusLabel(record.status)}`,
      '',
    ]

    if (record.aiSummary) {
      lines.push('【サマリー】')
      lines.push(record.aiSummary)
      lines.push('')
    }

    const sorted = [...record.entries].sort(
      (a, b) => a.displayOrder - b.displayOrder
    )
    const grouped = groupByCategory(sorted)

    for (const [category, entries] of Object.entries(grouped)) {
      lines.push(`【${categoryLabel(category)}】`)
      for (const entry of entries) {
        lines.push(`- ${entry.content}`)
      }
      lines.push('')
    }

    lines.push('──────────────────────────')
    lines.push(`出力日時: ${new Date().toLocaleString('ja-JP')}`)

    return { success: true, text: lines.join('\n') }
  } catch (error) {
    console.error('[karute-export] Text generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text generation failed',
    }
  }
}
