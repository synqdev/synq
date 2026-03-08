'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useChatContext } from '@/components/chat/ChatProvider'

interface AppointmentSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  bookingId: string
  locale: string
  todayBookingIds: string[]
  customerId: string
}

const tabs = [
  { id: 'recording', icon: 'mic' },
  { id: 'karute', icon: 'clipboard' },
  { id: 'customer', icon: 'user' },
  { id: 'settings', icon: 'gear' },
] as const

function TabIcon({ type, className }: { type: string; className?: string }) {
  const cn = className ?? 'h-5 w-5'
  switch (type) {
    case 'mic':
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      )
    case 'clipboard':
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      )
    case 'user':
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    case 'gear':
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return null
  }
}

export function AppointmentSidebar({
  activeTab,
  onTabChange,
  bookingId,
  locale,
  todayBookingIds,
  customerId,
}: AppointmentSidebarProps) {
  const t = useTranslations('admin.sidebar')
  const tAppointment = useTranslations('admin.appointment')
  const { setIsOpen, setCustomerId } = useChatContext()

  const currentIndex = todayBookingIds.indexOf(bookingId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < todayBookingIds.length - 1

  const handleChatOpen = () => {
    setCustomerId(customerId)
    setIsOpen(true)
  }

  return (
    <aside className="flex w-16 flex-col bg-[#1a2332] py-4 md:w-56">
      {/* Back to dashboard */}
      <Link
        href={`/${locale}/admin/dashboard`}
        className="mb-6 flex items-center gap-2 px-4 text-gray-400 transition-colors hover:text-white"
      >
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span className="hidden text-sm md:inline">{t('backToDashboard')}</span>
      </Link>

      {/* Tab shortcuts */}
      <nav className="space-y-1 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors md:justify-start ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <TabIcon type={tab.icon} />
            <span className="hidden md:inline">{tAppointment(tab.id)}</span>
          </button>
        ))}
      </nav>

      {/* AI Chat trigger */}
      <button
        onClick={handleChatOpen}
        className="mx-2 mt-auto flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:justify-start"
      >
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        <span className="hidden text-sm md:inline">{t('aiChat')}</span>
      </button>

      {/* Prev/Next navigation */}
      <div className="mt-4 flex flex-col items-center gap-1 px-2">
        {hasPrev ? (
          <Link
            href={`/${locale}/appointment/${todayBookingIds[currentIndex - 1]}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:justify-start"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <span className="hidden text-xs md:inline">{t('prevAppointment')}</span>
          </Link>
        ) : (
          <div className="h-9" />
        )}
        {hasNext ? (
          <Link
            href={`/${locale}/appointment/${todayBookingIds[currentIndex + 1]}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:justify-start"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            <span className="hidden text-xs md:inline">{t('nextAppointment')}</span>
          </Link>
        ) : (
          <div className="h-9" />
        )}
      </div>
    </aside>
  )
}
