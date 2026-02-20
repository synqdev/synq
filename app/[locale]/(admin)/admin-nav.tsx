'use client'

/**
 * Admin Navigation Component
 *
 * Tab-style navigation for admin pages.
 * Highlights the current active tab.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface AdminNavProps {
  locale: string
}

const navItems = [
  { href: '/admin/dashboard', labelKey: 'dashboard' },
  { href: '/admin/workers', labelKey: 'workers' },
  { href: '/admin/services', labelKey: 'services' },
  { href: '/admin/resources', labelKey: 'resources' },
]

export function AdminNav({ locale }: AdminNavProps) {
  const pathname = usePathname()
  const t = useTranslations('admin.nav')

  // Prototype calendar route has its own in-canvas tab navigation.
  if (pathname === `/${locale}/admin/dashboard/new`) {
    return null
  }

  return (
    <nav className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {navItems.map((item) => {
            const fullHref = `/${locale}${item.href}`
            const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`)

            return (
              <Link
                key={item.href}
                href={fullHref}
                className={`
                  relative py-3 text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {t(item.labelKey)}
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
