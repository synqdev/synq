import { ChatWrapper } from '@/components/chat/ChatWrapper'

interface AppointmentLayoutProps {
  children: React.ReactNode
}

export default function AppointmentLayout({ children }: AppointmentLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <ChatWrapper>
        {children}
      </ChatWrapper>
    </div>
  )
}
