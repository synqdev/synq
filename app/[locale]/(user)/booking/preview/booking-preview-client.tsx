'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Service, Worker, Customer } from '@prisma/client'

import { BUSINESS_TIMEZONE } from '@/lib/constants'

interface BookingPreviewProps {
  locale: string
  service: Service
  worker: Worker
  customer: Customer
  startTime: Date
  endTime: Date
  resourceId: string
}

export function BookingPreview({
  locale,
  service,
  worker,
  customer,
  startTime,
  endTime,
  resourceId,
}: BookingPreviewProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          workerId: worker.id,
          customerId: customer.id,
          resourceId,
          startsAt: startTime.toISOString(),
          endsAt: endTime.toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create booking')
      }

      const { booking } = await response.json()
      router.push(`/${locale}/booking/confirm?id=${booking.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      setIsSubmitting(false)
    }
  }



  const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    dateStyle: 'full',
    timeZone: BUSINESS_TIMEZONE,
  })
  const timeFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  })

  const formattedDate = dateFormatter.format(startTime)
  const formattedTime = `${timeFormatter.format(startTime)} - ${timeFormatter.format(endTime)}`

  const serviceName = locale === 'ja' ? service.name : service.nameEn || service.name
  const workerName = locale === 'ja' ? worker.name : worker.nameEn || worker.name

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        {locale === 'ja' ? '予約内容確認' : 'Review Booking'}
      </h1>
      <p className="text-gray-600 mb-8">
        {locale === 'ja'
          ? '予約内容をご確認の上、確定してください'
          : 'Please review your booking details and confirm'}
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{locale === 'ja' ? 'サービス' : 'Service'}</span>
          <span className="font-medium">{serviceName}</span>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{locale === 'ja' ? '担当者' : 'Staff'}</span>
          <span className="font-medium">{workerName}</span>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{locale === 'ja' ? '日時' : 'Date & Time'}</span>
          <div className="text-right">
            <div className="font-medium">{formattedDate}</div>
            <div className="text-gray-600 text-sm">{formattedTime}</div>
          </div>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{locale === 'ja' ? '時間' : 'Duration'}</span>
          <span className="font-medium">
            {service.duration} {locale === 'ja' ? '分' : 'min'}
          </span>
        </div>

        <div className="flex justify-between pb-4">
          <span className="text-gray-600">{locale === 'ja' ? '料金' : 'Price'}</span>
          <span className="font-medium text-lg">¥{service.price.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          {locale === 'ja' ? '戻る' : 'Back'}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50"
        >
          {isSubmitting
            ? locale === 'ja'
              ? '予約中...'
              : 'Booking...'
            : locale === 'ja'
              ? '予約を確定'
              : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )
}
