'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface UseChatStreamOptions {
  onComplete: (content: string, conversationId: string) => void
}

interface UseChatStreamReturn {
  sendMessage: (
    message: string,
    customerId: string | null,
    conversationId: string | null,
    locale: string
  ) => void
  isStreaming: boolean
  streamingContent: string | null
  error: string | null
}

/**
 * Custom hook for consuming SSE stream from POST /api/admin/chat.
 *
 * Uses fetch + ReadableStream.getReader() (NOT EventSource which is GET-only).
 * Implements AbortController for cleanup on unmount.
 * Parses SSE events: { content }, { usage }, { conversationId }, [DONE].
 * Disables sending while already streaming (prevents race conditions).
 */
export function useChatStream({
  onComplete,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isStreamingRef = useRef(false)

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(
    async (
      message: string,
      customerId: string | null,
      conversationId: string | null,
      locale: string
    ) => {
      // Prevent sending while already streaming (ref avoids stale closure)
      if (isStreamingRef.current) return

      isStreamingRef.current = true
      setIsStreaming(true)
      setStreamingContent('')
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      let accumulated = ''
      let receivedConversationId = conversationId || ''

      try {
        const res = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, customerId, conversationId, locale }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(
            (errBody as { error?: string }).error || `HTTP ${res.status}`
          )
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        /**
         * Parse and apply a single SSE event string (everything between \n\n delimiters).
         */
        const processEvent = (event: string) => {
          if (!event.trim()) return

          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)

            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data) as {
                content?: string
                conversationId?: string
                usage?: unknown
              }

              if (parsed.conversationId) {
                receivedConversationId = parsed.conversationId
              }

              if (parsed.content) {
                accumulated += parsed.content
                setStreamingContent(accumulated)
              }
              // usage event is informational, no UI action needed
            } catch {
              // Skip unparseable lines
            }
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Normalize CRLF to LF so event splitting works regardless of server line endings
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
          const events = buffer.split('\n\n')
          // Keep last incomplete chunk in buffer
          buffer = events.pop() || ''

          for (const event of events) {
            processEvent(event)
          }
        }

        // Drain any remaining buffered data that lacked a trailing blank line
        if (buffer.trim()) {
          processEvent(buffer)
        }

        // Streaming complete
        onComplete(accumulated, receivedConversationId)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Stream failed')
        }
      } finally {
        isStreamingRef.current = false
        setIsStreaming(false)
        setStreamingContent(null)
        abortRef.current = null
      }
    },
    [onComplete]
  )

  return { sendMessage, isStreaming, streamingContent, error }
}
