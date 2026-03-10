'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChatBubble } from './ChatBubble'
import type { Message } from './types'
import type { ToolCallEvent, ToolResultEvent } from './useChatStream'

interface ChatMessagesProps {
  messages: Message[]
  streamingContent: string | null
  customerId: string | null
  activeToolCall?: ToolCallEvent | null
  toolResults?: ToolResultEvent[]
}

/**
 * Message list container with auto-scroll.
 *
 * Shows empty state when no messages.
 * Renders an extra assistant bubble for streaming content.
 * Shows tool execution status inline during streaming.
 */
export function ChatMessages({
  messages,
  streamingContent,
  customerId,
  activeToolCall,
  toolResults,
}: ChatMessagesProps) {
  const t = useTranslations('admin.chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, activeToolCall, toolResults])

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

      {/* Tool execution indicators */}
      {toolResults && toolResults.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {toolResults.map((result, i) => (
            <ToolResultBadge key={i} result={result} />
          ))}
        </div>
      )}

      {activeToolCall && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            {formatToolCallLabel(activeToolCall)}
          </span>
        </div>
      )}

      {streamingContent !== null && (
        <ChatBubble role="assistant" content={streamingContent || '...'} />
      )}
      <div ref={bottomRef} />
    </div>
  )
}

const TOOL_LABELS: Record<string, string> = {
  update_worker_schedule: 'Updating schedule...',
  lookup_workers: 'Looking up workers...',
  get_worker_schedule: 'Checking schedule...',
}

function formatToolCallLabel(toolCall: ToolCallEvent): string {
  return TOOL_LABELS[toolCall.name] ?? `Running ${toolCall.name}...`
}

function ToolResultBadge({ result }: { result: ToolResultEvent }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
        result.success
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {result.success ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>{result.result.split('\n')[0]}</span>
    </div>
  )
}
