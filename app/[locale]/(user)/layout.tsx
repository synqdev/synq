import { UserHeader } from './user-header'

interface UserLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function UserLayout({ children, params }: UserLayoutProps) {
  const { locale } = await params

  return (
    <div className="min-h-screen">
      <UserHeader locale={locale} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
