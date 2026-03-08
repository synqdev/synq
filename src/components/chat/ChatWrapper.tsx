'use client'

import { type ReactNode } from 'react'
import { ChatProvider } from './ChatProvider'
import { ChatPanel } from './ChatPanel'

/**
 * Client wrapper that provides chat context and renders the chat panel.
 * Used in the server-side admin layout to avoid marking the layout as 'use client'.
 */
export function ChatWrapper({ children }: { children: ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <ChatPanel />
    </ChatProvider>
  )
}
