'use client'

import { useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useChatContext } from './ChatProvider'
import { useChatStream } from './useChatStream'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { QuickActions } from './QuickActions'

/**
 * Slide-over chat panel container.
 *
 * Fixed position on the right side of the screen.
 * Uses Tailwind translate-x + transition for slide animation.
 * Includes a floating action button to toggle open/close.
 * Backdrop overlay closes panel on click.
 */
export function ChatPanel() {
  const t = useTranslations('admin.chat')
  const locale = useLocale()
  const {
    isOpen,
    setIsOpen,
    customerId,
    messages,
    setMessages,
    conversationId,
    setConversationId,
    refreshHistory,
  } = useChatContext()

  const handleComplete = useCallback(
    (content: string, newConversationId: string) => {
      // Add the completed assistant message to the list
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content,
          createdAt: new Date().toISOString(),
        },
      ])
      // Update conversationId if we received one
      if (newConversationId) {
        setConversationId(newConversationId)
      }
      // Refresh history to get server-persisted data
      refreshHistory()
    },
    [setMessages, setConversationId, refreshHistory]
  )

  const { sendMessage, isStreaming, streamingContent, error } = useChatStream({
    onComplete: handleComplete,
  })

  const handleSend = useCallback(
    (message: string) => {
      // Add user message to the list immediately
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content: message,
          createdAt: new Date().toISOString(),
        },
      ])
      sendMessage(message, customerId, conversationId, locale)
    },
    [sendMessage, customerId, conversationId, locale, setMessages]
  )

  const handleQuickAction = useCallback(
    (message: string) => {
      handleSend(message)
    },
    [handleSend]
  )

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        aria-label={t('title')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
        >
          <path
            fillRule="evenodd"
            d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-96 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {t('title')}
            </h2>
            {customerId && (
              <p className="text-xs text-gray-500">{t('customerContextActive')}</p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('close')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {t('error')}: {error}
          </div>
        )}

        {/* Messages */}
        <ChatMessages
          messages={messages}
          streamingContent={streamingContent}
          customerId={customerId}
        />

        {/* Footer: Quick actions + Input */}
        <div className="flex-shrink-0">
          <QuickActions
            customerId={customerId}
            onAction={handleQuickAction}
            isStreaming={isStreaming}
          />
          <ChatInput onSend={handleSend} isStreaming={isStreaming} />
        </div>
      </div>
    </>
  )
}
