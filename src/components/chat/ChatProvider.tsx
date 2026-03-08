'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import useSWR from 'swr'
import type { Message } from './types'

interface ChatContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  customerId: string | null
  setCustomerId: (id: string | null) => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  conversationId: string | null
  setConversationId: (id: string | null) => void
  refreshHistory: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`)
  }
  return res.json()
}

interface HistoryResponse {
  conversation: {
    id: string
    customerId: string | null
    title: string | null
    createdAt: string
    updatedAt: string
  } | null
  messages: Message[]
}

/**
 * React context for chat state management.
 *
 * Uses SWR to load chat history when customerId changes.
 * Provides state and setters for the chat panel.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)

  const { data, mutate } = useSWR<HistoryResponse>(
    customerId ? `/api/admin/chat/history/${customerId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // When SWR data loads, update messages and conversationId
  useEffect(() => {
    if (data) {
      setMessages(data.messages || [])
      setConversationId(data.conversation?.id || null)
    }
  }, [data])

  // Reset messages when customerId changes to null (global mode)
  useEffect(() => {
    if (customerId === null) {
      setMessages([])
      setConversationId(null)
    }
  }, [customerId])

  const refreshHistory = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        customerId,
        setCustomerId,
        messages,
        setMessages,
        conversationId,
        setConversationId,
        refreshHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

/**
 * Hook to access chat context. Must be used within ChatProvider.
 */
export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return ctx
}
