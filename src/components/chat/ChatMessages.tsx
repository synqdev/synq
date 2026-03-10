'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChatBubble } from './ChatBubble'
import type { Message } from './types'

interface ChatMessagesProps {
  messages: Message[]
  streamingContent: string | null
  customerId: string | null
}

/**
 * Message list container with auto-scroll.
 *
 * Shows empty state when no messages.
 * Renders an extra assistant bubble for streaming content.
 */
export function ChatMessages({
  messages,
  streamingContent,
  customerId,
}: ChatMessagesProps) {
  const t = useTranslations('admin.chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const isEmpty = messages.length === 0 && streamingContent === null

  if (isEmpty) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-gray-400">
          {customerId ? t('emptyCustomer') : t('emptyGlobal')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          citations={msg.citations}
          createdAt={msg.createdAt}
        />
      ))}
      {streamingContent !== null && (
        <ChatBubble role="assistant" content={streamingContent || '...'} />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
