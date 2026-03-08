import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ============================================================================
// FONT REGISTRATION
// ============================================================================

Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf',
    },
    {
      src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf',
      fontWeight: 'bold',
    },
  ],
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansJP',
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  headerSection: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  headerValue: {
    flex: 1,
  },
  summarySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #ccc',
  },
  summaryText: {
    lineHeight: 1.6,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  entryItem: {
    marginBottom: 4,
    paddingLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
})

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

interface EntryData {
  category: string
  content: string
  displayOrder: number
}

function groupByCategory(entries: EntryData[]): Record<string, EntryData[]> {
  const groups: Record<string, EntryData[]> = {}
  for (const entry of entries) {
    if (!groups[entry.category]) {
      groups[entry.category] = []
    }
    groups[entry.category].push(entry)
  }
  return groups
}

// ============================================================================
// TYPES
// ============================================================================

export interface KaruteDocumentData {
  id: string
  status: string
  aiSummary?: string | null
  createdAt: string
  entries: EntryData[]
  customer: { name: string }
  worker: { name: string }
  booking?: { startsAt: string } | null
}

// ============================================================================
// COMPONENT
// ============================================================================

interface KaruteDocumentProps {
  record: KaruteDocumentData
}

/**
 * React PDF document component for karute record export.
 * Renders a formatted treatment record with header, summary,
 * and entries grouped by category. Uses Noto Sans JP for Japanese text.
 */
export function KaruteDocument({ record }: KaruteDocumentProps) {
  const dateStr = record.booking?.startsAt
    ? new Date(record.booking.startsAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    : new Date(record.createdAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })

  const grouped = groupByCategory(
    [...record.entries].sort((a, b) => a.displayOrder - b.displayOrder)
  )
  const generatedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>施術記録 / Treatment Record</Text>

        {/* Header info */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>日付:</Text>
            <Text style={styles.headerValue}>{dateStr}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>施術者:</Text>
            <Text style={styles.headerValue}>{record.worker.name}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>患者:</Text>
            <Text style={styles.headerValue}>{record.customer.name}</Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>ステータス:</Text>
            <Text style={styles.headerValue}>{statusLabel(record.status)}</Text>
          </View>
        </View>

        {/* Summary */}
        {record.aiSummary && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>サマリー</Text>
            <Text style={styles.summaryText}>{record.aiSummary}</Text>
          </View>
        )}

        {/* Entries by category */}
        {Object.entries(grouped).map(([category, entries]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryHeader}>
              【{categoryLabel(category)}】
            </Text>
            {entries.map((entry, idx) => (
              <Text key={idx} style={styles.entryItem}>
                - {entry.content}
              </Text>
            ))}
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          出力日時: {generatedAt}
        </Text>
      </Page>
    </Document>
  )
}
