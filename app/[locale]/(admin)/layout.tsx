import { getAdminSession } from '@/lib/auth/admin'
import { adminLogout } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { AdminNav } from './admin-nav'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Admin layout with header, navigation, and logout functionality.
 *
 * Shows navigation and logout button only when authenticated.
 * Auth check for protected pages happens in individual pages (not here)
 * to allow login page to render without auth.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const isAuthenticated = await getAdminSession()
  const { locale } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SYNQ Admin</h1>
          {isAuthenticated && (
            <form action={adminLogout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Button>
            </form>
          )}
        </div>
        {isAuthenticated && <AdminNav locale={locale} />}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
