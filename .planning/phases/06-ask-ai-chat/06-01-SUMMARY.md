---
phase: 06-ask-ai-chat
plan: 01
subsystem: api
tags: [openai, streaming, sse, prisma, chat, ai]

requires:
  - phase: 03-karte-foundation
    provides: KaruteRecord and KaruteEntry models for context building
  - phase: 04-recording-transcription
    provides: OpenAI SDK integration pattern and lazy client
provides:
  - ChatConversation and ChatMessage Prisma models
  - Chat service with context building, streaming support, and history
  - POST /api/admin/chat streaming endpoint
  - GET /api/admin/chat/history/[customerId] endpoint
affects: [06-02-chat-ui, 06-03-chat-integration]

tech-stack:
  added: []
  patterns: [SSE streaming via ReadableStream, tiered context budget, citation parsing]

key-files:
  created:
    - src/lib/services/chat.service.ts
    - src/lib/validations/chat.ts
    - app/api/admin/chat/route.ts
    - app/api/admin/chat/history/[customerId]/route.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Tiered context budget: 8000 tokens max, full entries for last 3 records, aiSummary for older"
  - "24-hour conversation auto-renewal: new conversation if last message >24h ago"
  - "Citation format [KR:uuid] parsed server-side after streaming completes"

patterns-established:
  - "SSE streaming: ReadableStream with TextEncoder, data: JSON + data: [DONE] protocol"
  - "ChatResult<T> discriminated union matching KaruteResult<T> pattern"
  - "Context building with token budget and truncation logging"

duration: 3min
completed: 2026-03-07
---

# Phase 6 Plan 1: Chat Backend Summary

**Chat service with OpenAI SSE streaming, customer context building from karute/booking data, and conversation persistence via Prisma**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T01:32:30Z
- **Completed:** 2026-03-08T01:35:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ChatConversation and ChatMessage Prisma models with indexes, pushed to database
- Chat service with 5 exported functions: getOrCreateConversation, getChatHistory, buildChatContext, saveMessage, getOpenAI
- Customer-scoped context building from profile, karute records (full + summary), and bookings with 8000 token budget
- Global context mode using last 30 days of karute records (max 50)
- POST streaming endpoint with SSE protocol and citation extraction
- GET history endpoint returning conversation with messages

## Task Commits

1. **Task 1: Prisma schema, validation, and chat service** - `946e9f8` (feat)
2. **Task 2: API routes for chat streaming and history** - `66a7924` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added ChatConversation and ChatMessage models with Customer relation
- `src/lib/validations/chat.ts` - Zod schema for chat message input validation
- `src/lib/services/chat.service.ts` - Chat context building, OpenAI client, conversation management, message persistence
- `app/api/admin/chat/route.ts` - POST endpoint streaming OpenAI responses as SSE
- `app/api/admin/chat/history/[customerId]/route.ts` - GET endpoint for loading chat history

## Decisions Made
- Tiered context budget (8000 tokens): full karute entries for last 3 records, aiSummary only for older records, with truncation logging
- 24-hour auto-renewal for conversations: creates new conversation if last message was over 24 hours ago
- Citation format [KR:uuid] embedded in AI responses, parsed server-side after streaming completes
- ConversationId sent as first SSE event so client can track the conversation
- Auto-title set from first 50 chars of first user message

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - OPENAI_API_KEY already configured from phase 04 (recording transcription).

## Next Phase Readiness
- Chat backend fully functional, ready for UI consumption (plan 06-02)
- SSE protocol documented: `data: {"conversationId":"..."}`, `data: {"content":"..."}`, `data: {"usage":{...}}`, `data: [DONE]`
- History endpoint ready for SWR fetching in chat panel

---
*Phase: 06-ask-ai-chat*
*Completed: 2026-03-07*
