/**
 * Chat Validation Schemas
 *
 * Zod schemas for validating chat API input.
 */

import { z } from 'zod'

/**
 * Schema for sending a chat message.
 * - message: 1-2000 characters
 * - customerId: optional customer scope (null = global mode)
 * - conversationId: optional existing conversation to continue
 * - locale: response language preference
 */
export const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  customerId: z.string().nullable().optional().default(null),
  conversationId: z.string().nullable().optional().default(null),
  locale: z.enum(['ja', 'en']).optional().default('ja'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
