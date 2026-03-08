'use client'

import { useState } from 'react'
import Link from 'next/link'
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as Tab)
  }

  const karuteRecord = booking.karuteRecords[0] ?? null

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
            <SettingsTabContent locale={locale} tSettings={tSettings} viewSettingsLabel={t('viewSettings')} />
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
  viewSettingsLabel,
}: {
  locale: string
  tSettings: ReturnType<typeof useTranslations>
  viewSettingsLabel: string
}) {
  const { data, isLoading } = useSWR<AdminSettingsData>(
    '/api/admin/settings',
    settingsFetcher,
    { revalidateOnFocus: false }
  )

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{tSettings('title')}</h3>
      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-xs text-gray-500">{tSettings('aiProvider')}</span>
            <p className="text-sm font-medium text-gray-900">{data.aiProvider}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">{tSettings('businessType')}</span>
            <p className="text-sm font-medium text-gray-900">{tSettings(data.businessType as 'general' | 'salon' | 'clinic')}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">{tSettings('recordingLang')}</span>
            <p className="text-sm font-medium text-gray-900">{data.recordingLang}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">{tSettings('audioQuality')}</span>
            <p className="text-sm font-medium text-gray-900">{tSettings(data.audioQuality as 'standard' | 'high')}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">{tSettings('autoTranscribe')}</span>
            <p className="text-sm font-medium text-gray-900">
              {data.autoTranscribe ? (locale === 'ja' ? 'ON' : 'On') : (locale === 'ja' ? 'OFF' : 'Off')}
            </p>
          </div>
        </div>
      )}
      <div className="mt-6">
        <Link
          href={`/${locale}/admin/settings`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          {viewSettingsLabel}
        </Link>
      </div>
    </div>
  )
}
