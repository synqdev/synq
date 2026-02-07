'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { isLocale } from '@/lib/i18n/locale'

interface PublicHeaderProps {
    locale: string
}

export function PublicHeader({ locale }: PublicHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const tCommon = useTranslations('common')

    const switchLocale = (newLocale: string) => {
        // Replace the locale in the current path
        // Assuming path starts with /:locale or is just /:locale
        // Simple replacement might fail if path doesn't contain locale, but middleware usually enforces it
        // A robust regex replacement:
        const newPath = pathname.replace(/^\/(en|ja)/, `/${newLocale}`)
        router.push(newPath)
    }

    return (
        <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">SYNQ</h1>

                <div className="flex items-center gap-4">
                    {/* Language Switcher */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => switchLocale('ja')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${isLocale(locale, 'ja')
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tCommon('localeJa')}
                        </button>
                        <button
                            onClick={() => switchLocale('en')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${isLocale(locale, 'en')
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tCommon('localeEn')}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
