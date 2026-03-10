'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { RecordingPanel } from '@/components/recording/RecordingPanel'
import { KaruteEditor } from '@/components/karute/KaruteEditor'
import { AppointmentSidebar } from '@/components/appointment/AppointmentSidebar'
import { AppointmentSummaryBar } from '@/components/appointment/AppointmentSummaryBar'
import { CustomerInfoPanel } from '@/components/appointment/CustomerInfoPanel'
import { Spinner } from '@/components/ui'

// Serialized booking type matching page.tsx serialization
export interface SerializedBooking {
  id: string
  createdAt: string
  updatedAt: string
  startsAt: string
  endsAt: string
  status: string
  version: number
  workerId: string
  resourceId: string
  customerId: string
  serviceId: string
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
    locale: string
    notes: string | null
    visitCount: number
    lastVisitDate: string | null
  }
  worker: {
    id: string
    name: string
    nameEn: string | null
  }
  service: {
    id: string
    name: string
    nameEn: string | null
    duration: number
  }
  karuteRecords: {
    id: string
    status: string
    createdAt: string
  }[]
  recordingSessions: {
    id: string
    status: string
    startedAt: string
  }[]
}

interface AppointmentWorkstationProps {
  booking: SerializedBooking
  locale: string
  todayBookingIds: string[]
}

type Tab = 'recording' | 'karute' | 'customer' | 'settings'

interface AdminSettingsData {
  aiProvider: string
  businessType: string
  autoTranscribe: boolean
  recordingLang: string
  audioQuality: string
}

const settingsFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch settings')
    return r.json()
  })

export function AppointmentWorkstation({
  booking,
  locale,
  todayBookingIds,
}: AppointmentWorkstationProps) {
  const [activeTab, setActiveTab] = useState<Tab>('recording')
  const t = useTranslations('admin.appointment')
  const tSettings = useTranslations('admin.settingsPage')
  const router = useRouter()

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as Tab)
  }

  const serverKaruteRecord = booking.karuteRecords[0] ?? null
  const [clientKaruteId, setClientKaruteId] = useState<string | null>(null)
  const karuteRecord = serverKaruteRecord ?? (clientKaruteId ? { id: clientKaruteId, status: 'DRAFT', createdAt: new Date().toISOString() } : null)

  const handleKaruteCreated = useCallback((karuteRecordId: string) => {
    setClientKaruteId(karuteRecordId)
    router.refresh()
  }, [router])

  return (
    <div className="flex h-full w-full">
      {/* Dark navy sidebar */}
      <AppointmentSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        bookingId={booking.id}
        locale={locale}
        todayBookingIds={todayBookingIds}
        customerId={booking.customer.id}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Summary bar */}
        <AppointmentSummaryBar
          customerName={booking.customer.name}
          serviceName={booking.service.name}
          workerName={booking.worker.name}
          startsAt={booking.startsAt}
          endsAt={booking.endsAt}
          status={booking.status}
        />

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {activeTab === 'recording' && (
            <RecordingPanel
              customerId={booking.customerId}
              workerId={booking.workerId}
              bookingId={booking.id}
              karuteRecordId={karuteRecord?.id}
              onKaruteCreated={handleKaruteCreated}
            />
          )}

          {activeTab === 'karute' && (
            <KaruteTabContent
              karuteRecord={karuteRecord}
              locale={locale}
              noKaruteLabel={t('noKarute')}
            />
          )}

          {activeTab === 'customer' && (
            <CustomerInfoPanel
              customer={booking.customer}
              appLocale={locale}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTabContent locale={locale} tSettings={tSettings} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Karute Tab Content
// ============================================================================

function KaruteTabContent({
  karuteRecord,
  locale,
  noKaruteLabel,
}: {
  karuteRecord: { id: string; status: string; createdAt: string } | null
  locale: string
  noKaruteLabel: string
}) {
  if (karuteRecord) {
    return <KaruteEditor recordId={karuteRecord.id} locale={locale} />
  }

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
      <p className="text-sm text-gray-500">{noKaruteLabel}</p>
    </div>
  )
}

// ============================================================================
// Settings Tab Content
// ============================================================================

function SettingsTabContent({
  locale,
  tSettings,
}: {
  locale: string
  tSettings: ReturnType<typeof useTranslations>
  viewSettingsLabel?: string
}) {
  const { data, isLoading, error, mutate } = useSWR<AdminSettingsData>(
    '/api/admin/settings',
    settingsFetcher,
    { revalidateOnFocus: false }
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleChange = async (field: string, value: string | boolean) => {
    if (!data) return
    const updated = { ...data, [field]: value }
    // Optimistic update
    mutate(updated, false)
    setIsSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved = await res.json()
      mutate(saved, false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      mutate()
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-red-500">
        {tSettings('loadError')}
      </div>
    )
  }

  const selectClass = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{tSettings('title')}</h3>
        {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-xs text-green-600">Saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-red-500">Save failed</span>}
      </div>
      {data && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">{tSettings('aiProvider')}</span>
            <select
              className={selectClass}
              value={data.aiProvider}
              onChange={(e) => handleChange('aiProvider', e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">{tSettings('businessType')}</span>
            <select
              className={selectClass}
              value={data.businessType}
              onChange={(e) => handleChange('businessType', e.target.value)}
            >
              <option value="general">{tSettings('general')}</option>
              <option value="salon">{tSettings('salon')}</option>
              <option value="clinic">{tSettings('clinic')}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">{tSettings('recordingLang')}</span>
            <select
              className={selectClass}
              value={data.recordingLang}
              onChange={(e) => handleChange('recordingLang', e.target.value)}
            >
              <option value="ja">{locale === 'ja' ? '日本語' : 'Japanese'}</option>
              <option value="en">{locale === 'ja' ? '英語' : 'English'}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">{tSettings('audioQuality')}</span>
            <select
              className={selectClass}
              value={data.audioQuality}
              onChange={(e) => handleChange('audioQuality', e.target.value)}
            >
              <option value="standard">{tSettings('standard')}</option>
              <option value="high">{tSettings('high')}</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500">{tSettings('autoTranscribe')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={data.autoTranscribe}
              onClick={() => handleChange('autoTranscribe', !data.autoTranscribe)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${data.autoTranscribe ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${data.autoTranscribe ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>
      )}
    </div>
  )
}
