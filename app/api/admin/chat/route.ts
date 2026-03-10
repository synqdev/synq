/**
 * Chat Streaming API Route
 *
 * POST /api/admin/chat
 *
 * Accepts a chat message, builds customer context, streams OpenAI response
 * as SSE events. Supports tool/function calling for schedule management
 * and other admin actions. Persists both user and assistant messages.
 *
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server'
import type OpenAI from 'openai'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { sendMessageSchema } from '@/lib/validations/chat'
import {
  getOrCreateConversation,
  getChatHistory,
  buildChatContext,
  saveMessage,
  getOpenAI,
} from '@/lib/services/chat.service'
import { chatTools, executeTool } from '@/lib/ai/chat-tools'

/** Maximum number of tool call rounds to prevent infinite loops. */
const MAX_TOOL_ROUNDS = 5

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
    // Determine the conversation and its authoritative customer scope.
    let conversationId: string
    let contextCustomerId: string | null

    if (requestedConversationId) {
      // Re-use an existing conversation. Derive the customer scope from the
      // persisted row so a stale client cannot mix another customer's context.
      const existing = await prisma.chatConversation.findUnique({
        where: { id: requestedConversationId },
        select: { id: true, customerId: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      conversationId = existing.id
      contextCustomerId = existing.customerId
    } else {
      const convResult = await getOrCreateConversation(customerId ?? null)
      if (!convResult.success) {
        return NextResponse.json({ error: convResult.error }, { status: 500 })
      }
      conversationId = convResult.data.id
      contextCustomerId = customerId ?? null
    }

    // Build context and get history BEFORE saving the user message
    // to avoid including the new user message twice in the OpenAI context
    const [contextResult, historyResult] = await Promise.all([
      buildChatContext(contextCustomerId, locale),
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

    // Build messages array for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPromptWithTools(systemPrompt, locale) },
      ...history,
      { role: 'user', content: message },
    ]

    const openai = getOpenAI()
    const abortController = new AbortController()
    request.signal.addEventListener('abort', () => abortController.abort())

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

          // Tool call loop: the model may call tools multiple times
          let round = 0
          while (round < MAX_TOOL_ROUNDS) {
            round++

            const stream = await openai.chat.completions.create(
              {
                model: 'gpt-4o',
                messages,
                tools: chatTools,
                stream: true,
                stream_options: { include_usage: true },
              },
              { signal: abortController.signal }
            )

            // Accumulate streamed response (content + tool calls)
            let roundContent = ''
            const toolCalls: Map<
              number,
              { id: string; name: string; arguments: string }
            > = new Map()

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta

              // Stream text content to client immediately
              if (delta?.content) {
                roundContent += delta.content
                fullContent += delta.content
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: delta.content })}\n\n`
                  )
                )
              }

              // Accumulate tool call deltas
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const existing = toolCalls.get(tc.index)
                  if (existing) {
                    existing.arguments += tc.function?.arguments ?? ''
                  } else {
                    toolCalls.set(tc.index, {
                      id: tc.id ?? '',
                      name: tc.function?.name ?? '',
                      arguments: tc.function?.arguments ?? '',
                    })
                  }
                }
              }

              // Usage stats from final chunk
              if (chunk.usage) {
                totalTokens = chunk.usage.total_tokens
              }
            }

            // If no tool calls, we're done
            if (toolCalls.size === 0) {
              break
            }

            // Execute tool calls and add results to messages
            // Add the assistant's tool call message
            const toolCallsArray = Array.from(toolCalls.values())
            messages.push({
              role: 'assistant',
              content: roundContent || null,
              tool_calls: toolCallsArray.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            })

            // Execute each tool and add results
            for (const tc of toolCallsArray) {
              let args: Record<string, unknown>
              try {
                args = JSON.parse(tc.arguments)
              } catch {
                args = {}
              }

              // Notify client that a tool is being executed
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    toolCall: { name: tc.name, args },
                  })}\n\n`
                )
              )

              const result = await executeTool(tc.name, args)

              // Send tool result to client for transparency
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    toolResult: {
                      name: tc.name,
                      success: result.success,
                      result: result.result,
                    },
                  })}\n\n`
                )
              )

              // Add tool result to messages for next OpenAI round
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: result.result,
              })
            }

            // Loop continues — OpenAI will generate a final text response
            // using the tool results
          }

          // Save assistant response after streaming completes
          const citations = parseCitations(fullContent)
          const assistantSaveResult = await saveMessage(
            conversationId!,
            'assistant',
            fullContent,
            citations.length > 0 ? citations : undefined,
            totalTokens
          )
          if (!assistantSaveResult.success) {
            console.error('[chat/route] Failed to save assistant message', {
              conversationId,
              error: assistantSaveResult.error,
            })
          }

          // Send usage if we have it
          if (totalTokens) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ usage: { total_tokens: totalTokens } })}\n\n`
              )
            )
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          if (abortController.signal.aborted) {
            controller.close()
            return
          }
          console.error('[chat/route] Streaming error', { error })
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
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
 * Enhances the system prompt with tool usage instructions.
 */
function buildSystemPromptWithTools(basePrompt: string, locale: string): string {
  const toolInstructions =
    locale === 'en'
      ? `You also have access to tools for managing worker schedules. When the user asks you to update schedules, use the appropriate tool. Always confirm what you did after executing a tool.

If the user mentions a worker by name, use the lookup_workers tool first if you're unsure which worker they mean. Then use update_worker_schedule to set their schedule.

Day mapping: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.`
      : `あなたはスタッフのスケジュール管理ツールも使用できます。ユーザーがスケジュールの更新を依頼した場合は、適切なツールを使用してください。ツール実行後は必ず結果を確認してください。

ユーザーがスタッフ名を指定した場合、不明な場合はまず lookup_workers ツールで確認してください。その後 update_worker_schedule でスケジュールを設定します。

曜日の対応: 日曜=0, 月曜=1, 火曜=2, 水曜=3, 木曜=4, 金曜=5, 土曜=6。`

  return `${basePrompt}\n\n--- ツール使用ガイド ---\n${toolInstructions}`
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
