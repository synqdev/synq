'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'

interface Citation {
  karuteId: string
  label: string
}

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  createdAt?: string
}

/**
 * Individual message bubble with citation parsing.
 *
 * User messages: right-aligned, blue background, white text.
 * AI messages: left-aligned, light gray background, dark text.
 * Parses [KR:uuid] markers and replaces with numbered superscript links.
 */
export function ChatBubble({ role, content, citations, createdAt }: ChatBubbleProps) {
  const locale = useLocale()
  const isUser = role === 'user'

  // Parse [KR:uuid] markers into numbered links
  const parsedContent = useMemo(() => {
    const citationMap = new Map<string, number>()
    let counter = 0

    // Build citation index from citations array
    if (citations) {
      for (const c of citations) {
        if (!citationMap.has(c.karuteId)) {
          counter++
          citationMap.set(c.karuteId, counter)
        }
      }
    }

    // Split content on [KR:uuid] pattern
    const regex = /\[KR:([a-f0-9-]+)\]/g
    const parts: (string | { karuteId: string; index: number })[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }
      const karuteId = match[1]
      if (!citationMap.has(karuteId)) {
        counter++
        citationMap.set(karuteId, counter)
      }
      parts.push({ karuteId, index: citationMap.get(karuteId)! })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts
  }, [content, citations])

  const formattedTime = useMemo(() => {
    if (!createdAt) return null
    try {
      return new Date(createdAt).toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }, [createdAt, locale])

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {parsedContent.map((part, i) =>
            typeof part === 'string' ? (
              <span key={i}>{part}</span>
            ) : (
              <Link
                key={i}
                href={`/${locale}/admin/karute/${part.karuteId}`}
                className={`inline-flex items-center text-xs font-medium ${
                  isUser
                    ? 'text-blue-200 hover:text-white underline'
                    : 'text-blue-600 hover:text-blue-800 underline'
                }`}
                title={`Karute ${part.karuteId.slice(0, 8)}`}
              >
                [{part.index}]
              </Link>
            )
          )}
        </div>
        {formattedTime && (
          <p
            className={`mt-1 text-xs ${
              isUser ? 'text-blue-200' : 'text-gray-400'
            }`}
          >
            {formattedTime}
          </p>
        )}
      </div>
    </div>
  )
}
