'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getLocalizedName } from '@/lib/i18n/locale'

interface Service {
    id: string
    name: string
    nameEn?: string | null
    duration: number
    price: number
}

interface BookingSelectionFormProps {
    services: Service[]
    locale: string
}

export function BookingSelectionForm({ services, locale }: BookingSelectionFormProps) {
    const router = useRouter()
    const tBooking = useTranslations('booking')
    const tCommon = useTranslations('common')
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)

    const handleNext = () => {
        if (!selectedServiceId || !date) return
        setIsLoading(true)
        router.push(`/${locale}/booking/slots?serviceId=${selectedServiceId}&date=${date}`)
    }

    return (
        <div className="flex flex-col gap-6" data-testid="booking-selection-form">
            {/* Service Selection Section */}
            <section>
                <h2 className="text-xl font-semibold mb-4">
                    {tBooking('selectService')}
                </h2>
                <div className="grid gap-3">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            onClick={() => setSelectedServiceId(service.id)}
                            data-testid="booking-service-option"
                            className={`
                                cursor-pointer h-[57px] px-6 border-2 rounded-xl transition-all duration-200 flex items-center justify-between
                                ${selectedServiceId === service.id
                                    ? "border-black bg-black text-white shadow-md scale-[1.01]"
                                    : "border-black bg-white hover:bg-gray-100 text-black shadow-sm"}
                            `}
                        >
                            <div className="flex-1">
                                <span className="font-bold text-lg block">
                                    {getLocalizedName(locale, service.name, service.nameEn)}
                                </span>
                                <span className={`text-sm font-medium ${selectedServiceId === service.id ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {service.duration} {tCommon('minutes')}
                                </span>
                            </div>
                            <div className="font-mono font-medium">
                                ¥{service.price.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Date Selection Section - Only show if service is selected */}
            <section className={`transition-opacity duration-300 ${selectedServiceId ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                <h2 className="text-xl font-semibold mb-4">
                    {tBooking('selectDate')}
                </h2>
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={{ height: '57px', minHeight: '57px' }}
                            className="w-full h-[57px] px-6 appearance-none bg-transparent border-2 border-black rounded-xl text-lg font-medium focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition-all cursor-pointer shadow-sm placeholder:text-gray-500 block box-border"
                            required
                            data-testid="booking-date-input"
                        />
                    </div>
                </div>
            </section>

            {/* Action Bar */}
            <div className="">
                <Button
                    variant="iso"
                    className="w-full h-[57px] text-lg"
                    disabled={!selectedServiceId || !date || isLoading}
                    onClick={handleNext}
                    data-testid="booking-check-availability"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm" className="text-black" />
                            <span>{tCommon('loading')}</span>
                        </div>
                    ) : (
                        <span>{tBooking('checkAvailability')}</span>
                    )}
                </Button>
            </div>
        </div>
    )
}
