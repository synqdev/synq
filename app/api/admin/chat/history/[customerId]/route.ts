/**
 * Chat History API Route
 *
 * GET /api/admin/chat/history/[customerId]
 *
 * Returns the most recent conversation and messages for a customer.
 *
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getOrCreateConversation } from '@/lib/services/chat.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { customerId } = await params

  try {
    const result = await getOrCreateConversation(customerId)

    if (!result.success) {
      return NextResponse.json(
        { conversation: null, messages: [] },
        { status: 200 }
      )
    }

    const conversation = result.data

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        customerId: conversation.customerId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('[chat/history] Failed to load history', {
      error,
      customerId,
    })
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    )
  }
}
