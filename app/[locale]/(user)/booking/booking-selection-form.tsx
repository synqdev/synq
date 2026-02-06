'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

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
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)

    const handleNext = () => {
        if (!selectedServiceId || !date) return
        setIsLoading(true)
        router.push(`/${locale}/booking/slots?serviceId=${selectedServiceId}&date=${date}`)
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Service Selection Section */}
            <section>
                <h2 className="text-xl font-semibold mb-4">
                    {locale === 'ja' ? 'サービスを選択' : 'Select Service'}
                </h2>
                <div className="grid gap-3">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            onClick={() => setSelectedServiceId(service.id)}
                            className={`
                                cursor-pointer h-[57px] px-6 border-2 rounded-xl transition-all duration-200 flex items-center justify-between
                                ${selectedServiceId === service.id
                                    ? "border-black bg-black text-white shadow-md scale-[1.01]"
                                    : "border-black bg-white hover:bg-gray-100 text-black shadow-sm"}
                            `}
                        >
                            <div className="flex-1">
                                <span className="font-bold text-lg block">
                                    {locale === 'ja' ? service.name : service.nameEn || service.name}
                                </span>
                                <span className={`text-sm font-medium ${selectedServiceId === service.id ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {service.duration} {locale === 'ja' ? '分' : 'min'}
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
                    {locale === 'ja' ? '日付を選択' : 'Select Date'}
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
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm" className="text-black" />
                            <span>{locale === 'ja' ? '読み込み中...' : 'Loading...'}</span>
                        </div>
                    ) : (
                        <span>{locale === 'ja' ? '空き状況を確認' : 'Check Availability'}</span>
                    )}
                </Button>
            </div>
        </div>
    )
}
