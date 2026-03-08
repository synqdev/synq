/**
 * Chat Streaming API Route
 *
 * POST /api/admin/chat
 *
 * Accepts a chat message, builds customer context, streams OpenAI response
 * as SSE events. Persists both user and assistant messages.
 *
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { sendMessageSchema } from '@/lib/validations/chat'
import {
  getOrCreateConversation,
  getChatHistory,
  buildChatContext,
  saveMessage,
  getOpenAI,
} from '@/lib/services/chat.service'

export async function POST(request: Request) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = sendMessageSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parseResult.error.issues },
      { status: 400 }
    )
  }

  const { message, customerId, conversationId: requestedConversationId, locale } = parseResult.data

  try {
    // Get or create conversation
    let conversationId = requestedConversationId
    if (!conversationId) {
      const convResult = await getOrCreateConversation(customerId ?? null)
      if (!convResult.success) {
        return NextResponse.json({ error: convResult.error }, { status: 500 })
      }
      conversationId = convResult.data.id
    }

    // Build context and get history BEFORE saving the user message
    // to avoid including the new user message twice in the OpenAI context
    const [contextResult, historyResult] = await Promise.all([
      buildChatContext(customerId ?? null, locale),
      getChatHistory(conversationId),
    ])

    if (!contextResult.success) {
      return NextResponse.json({ error: contextResult.error }, { status: 500 })
    }
    if (!historyResult.success) {
      return NextResponse.json({ error: historyResult.error }, { status: 500 })
    }

    // Save user message after fetching history (history won't include this message)
    const saveResult = await saveMessage(conversationId, 'user', message)
    if (!saveResult.success) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 })
    }

    const systemPrompt = contextResult.data
    const history = historyResult.data

    // Create OpenAI streaming completion
    const openai = getOpenAI()
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...history,
        { role: 'user' as const, content: message },
      ],
      stream: true,
      stream_options: { include_usage: true },
    })

    // Convert to ReadableStream for SSE
    const encoder = new TextEncoder()
    let fullContent = ''
    let totalTokens: number | undefined

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversationId as first event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversationId })}\n\n`
            )
          )

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              fullContent += content
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content })}\n\n`
                )
              )
            }

            // Final chunk with usage stats
            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ usage: chunk.usage })}\n\n`
                )
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          // Save assistant response after streaming completes
          // Parse citations from the response
          const citations = parseCitations(fullContent)
          await saveMessage(
            conversationId!,
            'assistant',
            fullContent,
            citations.length > 0 ? citations : undefined,
            totalTokens
          )
        } catch (error) {
          console.error('[chat/route] Streaming error', { error })
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[chat/route] Chat failed', { error })
    return NextResponse.json(
      { error: 'Chat request failed' },
      { status: 500 }
    )
  }
}

/**
 * Extracts [KR:uuid] citations from AI response content.
 */
function parseCitations(
  content: string
): { karuteId: string; label: string }[] {
  const citationRegex = /\[KR:([a-f0-9-]+)\]/g
  const citations: { karuteId: string; label: string }[] = []
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(content)) !== null) {
    citations.push({
      karuteId: match[1],
      label: `KR:${match[1].slice(0, 8)}`,
    })
  }

  return citations
}
