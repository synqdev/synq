'use client'

import { usePathname, useRouter } from 'next/navigation'
import { signoutCustomer } from '@/app/actions/customer'

interface UserHeaderProps {
  locale: string
}

export function UserHeader({ locale }: UserHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignout = async () => {
    await signoutCustomer(locale)
  }

  const switchLocale = (newLocale: string) => {
    // Replace the locale in the current path
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`)
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
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                locale === 'ja'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              日本語
            </button>
            <button
              onClick={() => switchLocale('en')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                locale === 'en'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              English
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {locale === 'ja' ? 'サインアウト' : 'Sign Out'}
          </button>
        </div>
      </div>
    </header>
  )
}
