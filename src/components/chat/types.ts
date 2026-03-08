/**
 * Shared types for chat components.
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: { karuteId: string; label: string }[]
  createdAt: string
}
