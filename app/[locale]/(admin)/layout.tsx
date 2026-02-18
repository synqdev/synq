import { getAdminSession } from '@/lib/auth/admin'

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
  await getAdminSession()
  await params

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900">SYNQ</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
