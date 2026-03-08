'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

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

export function AppointmentWorkstation({
  booking,
  locale,
  todayBookingIds,
}: AppointmentWorkstationProps) {
  const [activeTab, setActiveTab] = useState<Tab>('recording')
  const t = useTranslations('admin.appointment')

  return (
    <div className="flex h-full w-full">
      {/* Placeholder - full implementation in Task 2 */}
      <div className="flex-1 p-6">
        <h1 className="text-xl font-semibold">{t('title')}: {booking.customer.name}</h1>
        <p className="text-gray-500">Active tab: {activeTab}</p>
      </div>
    </div>
  )
}
