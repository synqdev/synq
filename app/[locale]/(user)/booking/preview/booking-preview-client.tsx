'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Service, Worker, Customer } from '@prisma/client'

import { BUSINESS_TIMEZONE } from '@/lib/constants'
import { Spinner } from '@/components/ui/spinner'
import { getLocaleDateTag, getLocalizedName } from '@/lib/i18n/locale'

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
  const tBooking = useTranslations('booking')
  const tCommon = useTranslations('common')
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



  const dateFormatter = new Intl.DateTimeFormat(getLocaleDateTag(locale), {
    dateStyle: 'full',
    timeZone: BUSINESS_TIMEZONE,
  })
  const timeFormatter = new Intl.DateTimeFormat(getLocaleDateTag(locale), {
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  })

  const formattedDate = dateFormatter.format(startTime)
  const formattedTime = `${timeFormatter.format(startTime)} - ${timeFormatter.format(endTime)}`

  const serviceName = getLocalizedName(locale, service.name, service.nameEn)
  const workerName = getLocalizedName(locale, worker.name, worker.nameEn)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        {tBooking('reviewTitle')}
      </h1>
      <p className="text-gray-600 mb-8">
        {tBooking('reviewSubtitle')}
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{tBooking('reviewService')}</span>
          <span className="font-medium">{serviceName}</span>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{tBooking('reviewStaff')}</span>
          <span className="font-medium">{workerName}</span>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{tBooking('reviewDateTime')}</span>
          <div className="text-right">
            <div className="font-medium">{formattedDate}</div>
            <div className="text-gray-600 text-sm">{formattedTime}</div>
          </div>
        </div>

        <div className="flex justify-between border-b pb-4">
          <span className="text-gray-600">{tBooking('reviewDuration')}</span>
          <span className="font-medium">
            {service.duration} {tCommon('minutes')}
          </span>
        </div>

        <div className="flex justify-between pb-4">
          <span className="text-gray-600">{tBooking('reviewPrice')}</span>
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
          {tCommon('back')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" className="text-white" />
              <span>{tBooking('bookingInProgress')}</span>
            </div>
          ) : (
            tBooking('confirmBooking')
          )}
        </button>
      </div>
    </div>
  )
}
