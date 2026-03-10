import { PublicHeader } from './public-header'

interface PublicLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen">
      <main>
        {children}
      </main>
    </div>
  )
}
