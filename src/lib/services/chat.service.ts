/**
 * Chat Service
 *
 * AI chat logic: context building from customer data, OpenAI streaming,
 * conversation management, and message persistence.
 *
 * Follows the karute.service.ts pattern: ChatResult<T> discriminated union,
 * Sentry error capture, and structured logging.
 *
 * OpenAI client is created lazily (per 04-02 decision) to allow module
 * import without API key during tests and builds.
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/db/client'
import * as Sentry from '@sentry/nextjs'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result type for chat operations (discriminated union).
 */
export type ChatResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// OPENAI CLIENT (LAZY)
// ============================================================================

let openaiClient: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// ============================================================================
// HELPERS
// ============================================================================

function captureChatError(error: unknown, context: Record<string, unknown>) {
  Sentry.captureException(error)
  console.error('[chat.service] operation failed', { error, ...context })
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

/**
 * Rough token estimate: ~4 chars per token for mixed Japanese/English.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/**
 * Gets or creates a conversation for a customer (or global if null).
 * Auto-creates a new conversation if none exists or if last message was >24h ago.
 */
export async function getOrCreateConversation(
  customerId: string | null
): Promise<ChatResult<{
  id: string
  customerId: string | null
  title: string | null
  createdAt: Date
  updatedAt: Date
  messages: { id: string; role: string; content: string; citations: unknown; tokenCount: number | null; createdAt: Date }[]
}>> {
  try {
    // Find most recent conversation for this customer (or global)
    const existing = await prisma.chatConversation.findFirst({
      where: { customerId: customerId ?? null },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    })

    // Check if we should reuse or create new
    if (existing) {
      const lastMessage = existing.messages[existing.messages.length - 1]
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Reuse if there are messages and the last one was within 24 hours
      if (lastMessage && lastMessage.createdAt > twentyFourHoursAgo) {
        return { success: true, data: existing }
      }

      // If no messages yet, reuse the empty conversation
      if (!lastMessage) {
        return { success: true, data: existing }
      }
    }

    // Create new conversation
    const conversation = await prisma.chatConversation.create({
      data: { customerId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return { success: true, data: conversation }
  } catch (error) {
    captureChatError(error, { operation: 'getOrCreateConversation', customerId })
    return { success: false, error: formatError(error) }
  }
}

// ============================================================================
// CHAT HISTORY
// ============================================================================

/**
 * Loads the last 20 messages for a conversation, formatted for OpenAI.
 */
export async function getChatHistory(
  conversationId: string
): Promise<ChatResult<{ role: 'user' | 'assistant'; content: string }[]>> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { role: true, content: true },
    })

    return {
      success: true,
      data: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }
  } catch (error) {
    captureChatError(error, { operation: 'getChatHistory', conversationId })
    return { success: false, error: formatError(error) }
  }
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

const CONTEXT_TOKEN_BUDGET = 8000

/**
 * Builds the system prompt for OpenAI based on customer data.
 *
 * Customer-scoped mode: includes profile, karute records, and bookings.
 * Global mode: includes recent karute records from last 30 days.
 */
export async function buildChatContext(
  customerId: string | null,
  locale: string = 'ja'
): Promise<ChatResult<string>> {
  try {
    if (!customerId) {
      return buildGlobalContext(locale)
    }
    return buildCustomerContext(customerId, locale)
  } catch (error) {
    captureChatError(error, { operation: 'buildChatContext', customerId, locale })
    return { success: false, error: formatError(error) }
  }
}

async function buildCustomerContext(
  customerId: string,
  locale: string
): Promise<ChatResult<string>> {
  try {
    const [customer, karuteRecords, bookings] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          name: true,
          notes: true,
          visitCount: true,
          lastVisitDate: true,
          email: true,
          phone: true,
        },
      }),
      prisma.karuteRecord.findMany({
        where: { customerId },
        include: {
          entries: true,
          worker: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.findMany({
        where: { customerId, status: 'CONFIRMED' },
        include: {
          service: { select: { name: true, nameEn: true } },
          worker: { select: { name: true } },
        },
        orderBy: { startsAt: 'desc' },
        take: 20,
      }),
    ])

    if (!customer) {
      return { success: false, error: 'Customer not found' }
    }

    const localeInstruction = locale === 'en'
      ? 'Respond in English.'
      : '日本語で回答してください。'

    let contextParts: string[] = []
    let currentTokens = 0

    // Always include customer profile (~200 tokens)
    const profileSection = formatCustomerProfile(customer)
    contextParts.push(profileSection)
    currentTokens += estimateTokens(profileSection)

    // Include full entries for last 3 karute records
    const recentRecords = karuteRecords.slice(0, 3)
    for (const record of recentRecords) {
      const section = formatKaruteRecordFull(record)
      const tokens = estimateTokens(section)
      if (currentTokens + tokens > CONTEXT_TOKEN_BUDGET) break
      contextParts.push(section)
      currentTokens += tokens
    }

    // Include aiSummary only for older records
    const olderRecords = karuteRecords.slice(3)
    for (const record of olderRecords) {
      if (!record.aiSummary) continue
      const section = `[カルテ ${record.id}] ${record.createdAt.toISOString().slice(0, 10)}: ${record.aiSummary}`
      const tokens = estimateTokens(section)
      if (currentTokens + tokens > CONTEXT_TOKEN_BUDGET) {
        console.log('[chat.service] Context truncated: token budget exceeded', {
          customerId,
          includedRecords: contextParts.length,
          totalRecords: karuteRecords.length,
        })
        break
      }
      contextParts.push(section)
      currentTokens += tokens
    }

    // Include bookings if budget allows
    if (bookings.length > 0 && currentTokens < CONTEXT_TOKEN_BUDGET) {
      const bookingSection = formatBookings(bookings)
      const tokens = estimateTokens(bookingSection)
      if (currentTokens + tokens <= CONTEXT_TOKEN_BUDGET) {
        contextParts.push(bookingSection)
      }
    }

    const systemPrompt = `あなたは日本の整体・マッサージ院のAIアシスタントです。
スタッフがお客様について質問しています。以下のデータを基に正確に回答してください。

${localeInstruction}

カルテ記録を参照する場合は [KR:record_id] 形式で引用してください。
例: "前回の施術では肩こりが主な症状でした[KR:abc-123]。"

--- お客様データ ---
${contextParts.join('\n\n')}`

    return { success: true, data: systemPrompt }
  } catch (error) {
    captureChatError(error, { operation: 'buildCustomerContext', customerId })
    return { success: false, error: formatError(error) }
  }
}

async function buildGlobalContext(locale: string): Promise<ChatResult<string>> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const recentRecords = await prisma.karuteRecord.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: {
        customer: { select: { name: true } },
        worker: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const localeInstruction = locale === 'en'
      ? 'Respond in English.'
      : '日本語で回答してください。'

    let contextParts: string[] = []
    let currentTokens = 0

    for (const record of recentRecords) {
      const summary = record.aiSummary || '(サマリーなし)'
      const section = `[${record.createdAt.toISOString().slice(0, 10)}] ${record.customer.name} (担当: ${record.worker.name}): ${summary}`
      const tokens = estimateTokens(section)
      if (currentTokens + tokens > CONTEXT_TOKEN_BUDGET) break
      contextParts.push(section)
      currentTokens += tokens
    }

    const systemPrompt = `あなたは日本の整体・マッサージ院のAIアシスタントです。
スタッフが院全体について質問しています。最近30日間のカルテ記録を基に回答してください。

${localeInstruction}

--- 最近のカルテ記録 ---
${contextParts.join('\n')}`

    return { success: true, data: systemPrompt }
  } catch (error) {
    captureChatError(error, { operation: 'buildGlobalContext' })
    return { success: false, error: formatError(error) }
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatCustomerProfile(customer: {
  name: string
  notes: string | null
  visitCount: number
  lastVisitDate: Date | null
  email: string
  phone: string | null
}): string {
  const lines = [
    `お客様: ${customer.name}`,
    `来院回数: ${customer.visitCount}回`,
  ]
  if (customer.lastVisitDate) {
    lines.push(`最終来院: ${customer.lastVisitDate.toISOString().slice(0, 10)}`)
  }
  if (customer.notes) {
    lines.push(`メモ: ${customer.notes}`)
  }
  return lines.join('\n')
}

function formatKaruteRecordFull(record: {
  id: string
  createdAt: Date
  aiSummary: string | null
  worker: { name: string }
  entries: { category: string; content: string }[]
}): string {
  const lines = [
    `[カルテ ${record.id}] ${record.createdAt.toISOString().slice(0, 10)} (担当: ${record.worker.name})`,
  ]
  if (record.aiSummary) {
    lines.push(`サマリー: ${record.aiSummary}`)
  }
  for (const entry of record.entries) {
    lines.push(`  - [${entry.category}] ${entry.content}`)
  }
  return lines.join('\n')
}

function formatBookings(bookings: {
  startsAt: Date
  service: { name: string; nameEn: string | null }
  worker: { name: string }
}[]): string {
  const lines = ['--- 予約履歴 ---']
  for (const booking of bookings) {
    lines.push(
      `${booking.startsAt.toISOString().slice(0, 10)} ${booking.service.name} (担当: ${booking.worker.name})`
    )
  }
  return lines.join('\n')
}

// ============================================================================
// MESSAGE PERSISTENCE
// ============================================================================

/**
 * Saves a message to the database. Updates conversation updatedAt.
 * If this is the first user message, sets conversation title.
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  citations?: { karuteId: string; label: string }[],
  tokenCount?: number
): Promise<ChatResult<{ id: string }>> {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
        citations: citations ?? undefined,
        tokenCount: tokenCount ?? undefined,
      },
      select: { id: true },
    })

    // Update conversation updatedAt
    const updateData: { updatedAt: Date; title?: string } = {
      updatedAt: new Date(),
    }

    // Set title from first user message
    if (role === 'user') {
      const messageCount = await prisma.chatMessage.count({
        where: { conversationId, role: 'user' },
      })
      if (messageCount === 1) {
        updateData.title = content.slice(0, 50)
      }
    }

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: updateData,
    })

    return { success: true, data: message }
  } catch (error) {
    captureChatError(error, { operation: 'saveMessage', conversationId, role })
    return { success: false, error: formatError(error) }
  }
}
