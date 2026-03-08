import { ChatWrapper } from '@/components/chat/ChatWrapper'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ChatWrapper>
        <main>{children}</main>
      </ChatWrapper>
    </div>
  )
}
