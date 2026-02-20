'use client'

/**
 * Admin Navigation Component
 *
 * Tab-style navigation for admin pages.
 * Highlights the current active tab.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AdminNavProps {
  locale: string
}

const navItems = [
  { href: '/admin/dashboard', labelJa: 'ダッシュボード', labelEn: 'Dashboard' },
  { href: '/admin/workers', labelJa: 'スタッフ', labelEn: 'Workers' },
  { href: '/admin/services', labelJa: 'サービス', labelEn: 'Services' },
  { href: '/admin/resources', labelJa: 'ベッド', labelEn: 'Resources' },
]

export function AdminNav({ locale }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {navItems.map((item) => {
            const fullHref = `/${locale}${item.href}`
            const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`)
            const label = locale === 'ja' ? item.labelJa : item.labelEn

            return (
              <Link
                key={item.href}
                href={fullHref}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  relative py-3 text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
