# Phase 6: Ask AI Chat - Research

**Researched:** 2026-03-07
**Domain:** AI chat interface with streaming, persistence, and customer data context
**Confidence:** HIGH

## Summary

This phase builds a chat interface for staff to ask AI questions about customers and their karute history. The codebase already has OpenAI SDK v6.27 integrated (used in classification.service.ts) with established patterns: lazy client instantiation, Zod v4 schemas, Japanese-first system prompts, and service-layer separation. The streaming implementation will use the OpenAI SDK's native `stream: true` option combined with a Next.js App Router route handler that returns a ReadableStream as a Response, implementing SSE to the client.

Chat history persistence requires new Prisma models (ChatConversation, ChatMessage). The UI is a slide-over panel component using Tailwind CSS, consistent with the existing component library (custom components in `src/components/`). The client-side will use `EventSource` or `fetch` with ReadableStream to consume the SSE stream, with SWR for chat history loading.

**Primary recommendation:** Use the raw OpenAI SDK (already installed) with `stream: true` and manual ReadableStream construction in a Next.js route handler. Do NOT add Vercel AI SDK -- the project only uses OpenAI and the existing pattern is raw SDK usage. Keep it simple and consistent.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Slide-over panel from the right side (like Intercom) -- staff keeps current page visible
- Simple single-line text input with send button, Enter to send
- Quick action buttons for common queries: 'Summarize last visit', 'Show treatment history', 'Any allergies?'
- Language matches user's current locale (ja or en)
- Both customer-scoped and global modes -- auto-context when viewing a customer, global for cross-customer queries
- AI has access to all karute records for the customer (no history limit)
- AI also has access to booking history and customer profile data (notes, preferences, visit count)
- Streaming responses via SSE -- text appears word-by-word as AI generates it
- Inline citations referencing specific karute records -- clickable links to the source record
- Japanese-first responses matching user locale
- Chat history saved per customer -- staff sees previous questions when re-opening chat for same customer
- Shared across all staff -- any staff member can see chat history for any customer
- Collaborative knowledge building
- Slide-over panel should be accessible from customer detail page and from karute record views
- Quick actions should be context-aware (different suggestions in customer-scoped vs global mode)

### Claude's Discretion
- Chat message bubble styling
- Quick action button set and wording
- SSE implementation details (API route vs edge function)
- Context window management for large karute histories
- Citation format and link behavior

### Deferred Ideas (OUT OF SCOPE)
- Voice input for chat queries -- future enhancement
- Chat export/sharing -- not needed for MVP
- AI-initiated alerts (proactive suggestions) -- separate feature
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^6.27.0 | Chat completions with streaming | Already installed, used in classification.service.ts |
| next | ^15.5.12 | App Router route handlers for SSE | Already installed, standard for API routes |
| prisma | ^6.19.2 | Chat history persistence | Already installed, all data access uses Prisma |
| swr | ^2.4.0 | Chat history loading & cache | Already used for data fetching throughout admin UI |
| next-intl | ^4.8.2 | i18n for chat UI labels | Already used for all admin pages |
| zod | ^4.3.6 | Input validation | Already used throughout service layer |
| tailwindcss | ^4.1.18 | Chat panel and bubble styling | Already used for all UI components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sentry/nextjs | ^10.38.0 | Error tracking for AI failures | Wrap all OpenAI calls, already used in classification.service |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw OpenAI SDK streaming | Vercel AI SDK (ai package) | Would add a dependency, provide useChat hook, but project already uses raw SDK. Consistency wins. |
| Manual SSE in route handler | Edge function | Node.js runtime is fine for this, edge has limitations with Prisma. Use standard route handler. |
| EventSource on client | fetch + ReadableStream reader | EventSource is simpler but doesn't support POST. Use fetch with getReader() for POST requests with body. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── services/
│       └── chat.service.ts          # AI chat logic, context building, OpenAI calls
├── components/
│   └── chat/
│       ├── ChatPanel.tsx            # Slide-over panel container
│       ├── ChatMessages.tsx         # Message list with auto-scroll
│       ├── ChatInput.tsx            # Input field + send button
│       ├── ChatBubble.tsx           # Individual message bubble
│       ├── QuickActions.tsx         # Quick action buttons
│       └── ChatProvider.tsx         # React context for chat state
app/
├── api/
│   └── admin/
│       └── chat/
│           ├── route.ts             # POST: send message + stream response
│           └── history/
│               └── [customerId]/
│                   └── route.ts     # GET: load chat history for customer
├── [locale]/
│   └── (admin)/
│       └── layout.tsx               # Mount ChatPanel at layout level (or provider)
prisma/
└── schema.prisma                    # Add ChatConversation, ChatMessage models
```

### Pattern 1: SSE Streaming via Route Handler
**What:** POST route handler that streams OpenAI responses as SSE
**When to use:** All chat message sends
**Example:**
```typescript
// app/api/admin/chat/route.ts
import { getAdminSession } from '@/lib/auth/admin'
import { buildChatContext, getChatHistory } from '@/lib/services/chat.service'

export async function POST(request: Request) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message, customerId, conversationId } = await request.json()

  // Build context from customer data + karute records
  const systemPrompt = await buildChatContext(customerId)
  const history = await getChatHistory(conversationId)

  const openai = getOpenAI()
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    stream: true,
    stream_options: { include_usage: true },
  })

  // Convert to ReadableStream for SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
          )
        }
        // Final chunk with usage stats
        if (chunk.usage) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`)
          )
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### Pattern 2: Client-Side Stream Consumption
**What:** Fetch with ReadableStream reader for consuming SSE from POST endpoint
**When to use:** Client chat component consuming streaming response
**Example:**
```typescript
// Inside ChatPanel or a custom hook
async function sendMessage(message: string) {
  const response = await fetch('/api/admin/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, customerId, conversationId }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (reader) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n\n').filter(Boolean)
    for (const line of lines) {
      if (line === 'data: [DONE]') break
      const data = JSON.parse(line.replace('data: ', ''))
      if (data.content) {
        // Append to current message state
        setStreamingContent(prev => prev + data.content)
      }
    }
  }
}
```

### Pattern 3: Context Building Service
**What:** Service function that assembles customer context for the AI system prompt
**When to use:** Every chat message to provide relevant customer data
**Example:**
```typescript
// src/lib/services/chat.service.ts
export async function buildChatContext(customerId: string | null): Promise<string> {
  if (!customerId) {
    return GLOBAL_SYSTEM_PROMPT
  }

  const [customer, karuteRecords, bookings] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.karuteRecord.findMany({
      where: { customerId },
      include: { entries: true, worker: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.findMany({
      where: { customerId, status: 'CONFIRMED' },
      include: { service: true, worker: true },
      orderBy: { startsAt: 'desc' },
      take: 20,
    }),
  ])

  return formatSystemPrompt(customer, karuteRecords, bookings)
}
```

### Pattern 4: Database Schema for Chat Persistence
**What:** Prisma models for storing chat conversations and messages
**When to use:** Persist all chat interactions per customer
**Example:**
```prisma
model ChatConversation {
  id         String        @id @default(uuid())
  customerId String?
  customer   Customer?     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  title      String?       // Auto-generated from first message
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  messages   ChatMessage[]

  @@index([customerId])
  @@index([createdAt])
}

model ChatMessage {
  id             String           @id @default(uuid())
  conversationId String
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String           // 'user' | 'assistant'
  content        String
  citations      Json?            // Array of { karuteId, label } for inline references
  tokenCount     Int?             // Track token usage
  createdAt      DateTime         @default(now())

  @@index([conversationId])
  @@index([createdAt])
}
```

### Pattern 5: Citation System
**What:** Embed karute record references in AI responses using structured instructions
**When to use:** Customer-scoped queries where AI references specific records
**Example:**
```typescript
// In the system prompt, instruct AI to use citation markers
const CITATION_INSTRUCTION = `
When referencing specific karute records, use the format [KR:record_id] inline.
Example: "前回の施術では肩こりが主な症状でした[KR:abc-123]。"
Always include the record ID so citations can be linked.
`

// Client-side: parse citations from AI response
function parseCitations(content: string): { text: string; citations: Citation[] } {
  const citationRegex = /\[KR:([a-f0-9-]+)\]/g
  const citations: Citation[] = []
  const text = content.replace(citationRegex, (match, id) => {
    citations.push({ karuteId: id })
    return `[${citations.length}]`  // Replace with numbered reference
  })
  return { text, citations }
}
```

### Anti-Patterns to Avoid
- **Sending all data on every request:** Build context server-side, never send raw DB data to the client and back. The route handler assembles context.
- **Unbounded context window:** With "no history limit" on karute records, a customer with many records could exceed context limits. Implement truncation strategy (see Pitfalls).
- **Blocking on persistence:** Save the AI response to the database AFTER streaming completes, not during. Don't delay the stream.
- **Using EventSource for POST:** EventSource only supports GET requests. Use fetch + ReadableStream reader instead since we need to POST message content.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE protocol | Custom SSE parser/emitter | TextEncoder + standard SSE format (`data: ...\n\n`) | SSE format is simple enough, but follow the spec exactly |
| Token counting | Manual tokenizer | `stream_options: { include_usage: true }` | OpenAI returns usage in final streaming chunk |
| OpenAI client | HTTP calls to OpenAI API | `openai` npm package (already installed) | Handles retries, types, streaming iteration |
| Slide-over panel animation | Custom CSS transitions | Tailwind `translate-x` + `transition` utilities | Consistent with existing UI patterns |
| i18n labels | Hardcoded strings | next-intl `useTranslations` | All admin UI uses this pattern |

**Key insight:** The project already has all the infrastructure. This phase is about composing existing patterns (OpenAI client, Prisma, SWR, Tailwind, next-intl) into a new feature, not introducing new technology.

## Common Pitfalls

### Pitfall 1: Context Window Overflow
**What goes wrong:** Customer with many karute records exceeds GPT-4o's context limit (~128k tokens)
**Why it happens:** Decision says "no history limit" but token limits are real
**How to avoid:** Implement a context budget strategy:
1. Always include: customer profile, last 5 karute summaries (aiSummary field), recent bookings
2. Include full entries only for recent records (e.g., last 3)
3. For older records, include only the aiSummary
4. Track total token estimate and truncate oldest data first
5. Log when truncation occurs for debugging
**Warning signs:** API errors with "context_length_exceeded", slow responses, high costs

### Pitfall 2: Stream Cleanup on Client Disconnect
**What goes wrong:** Client navigates away mid-stream, server keeps generating tokens (costs money)
**Why it happens:** ReadableStream doesn't automatically cancel the upstream OpenAI stream
**How to avoid:** Use AbortController on the client side and handle stream cancellation:
```typescript
// Client: abort on unmount
useEffect(() => {
  const controller = new AbortController()
  fetchStream(controller.signal)
  return () => controller.abort()
}, [])

// Server: check for client disconnect in the stream loop
// The OpenAI stream will be GC'd when the response stream is cancelled
```
**Warning signs:** High token usage without corresponding user activity

### Pitfall 3: Race Conditions in Chat State
**What goes wrong:** User sends multiple messages quickly, responses arrive out of order
**Why it happens:** Each message triggers a separate streaming request
**How to avoid:** Disable send button while streaming. Queue messages. Use a single active stream reference that gets replaced.
**Warning signs:** Messages appearing in wrong order, duplicate responses

### Pitfall 4: Zod v4 Incompatibility with OpenAI Helpers
**What goes wrong:** Using `zodResponseFormat` from OpenAI SDK fails with Zod v4
**Why it happens:** Project uses Zod v4, OpenAI's helper expects Zod v3
**How to avoid:** Use `z.toJSONSchema()` with `target: 'draft-7'` as done in classification.service.ts. For streaming chat, structured output is less needed (plain text responses), but if citations need structured format, use the same pattern.
**Warning signs:** Runtime errors about Zod schema conversion

### Pitfall 5: Chat History Growing Unbounded in System Prompt
**What goes wrong:** Long conversation threads send entire history as messages, exceeding context
**Why it happens:** Each request includes all previous messages for conversational continuity
**How to avoid:** Implement a sliding window: include only the last N messages (e.g., 10-20) plus the system prompt with customer context. Summarize older messages if needed.
**Warning signs:** Increasing response latency as conversations grow

### Pitfall 6: SSE Format Parsing Edge Cases
**What goes wrong:** Client parser breaks on multi-line content or special characters
**Why it happens:** SSE data can contain newlines within JSON payloads
**How to avoid:** Use `JSON.stringify` for SSE data (handles escaping), parse with `JSON.parse` on client. Split on `\n\n` for event boundaries, not `\n`.
**Warning signs:** Partial or garbled messages in the UI

## Code Examples

### Lazy OpenAI Client (Existing Pattern)
```typescript
// Source: src/lib/services/classification.service.ts (existing code)
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}
```

### Japanese System Prompt Pattern (Existing)
```typescript
// Source: src/lib/services/classification.service.ts
// All AI prompts are Japanese-first, matching the clinic domain
const SYSTEM_PROMPT = `あなたは日本の整体・マッサージ院のアシスタントです。...`
```

### SWR Data Fetching Pattern (Existing)
```typescript
// Source: app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch')
  return response.json()
}

const { data, error, isLoading, mutate } = useSWR(url, fetcher)
```

### Admin Auth Guard Pattern (Existing)
```typescript
// Source: app/api/admin/karute/[id]/classify/route.ts
const isAdmin = await getAdminSession()
if (!isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel AI SDK useChat | Raw OpenAI SDK + custom hooks | Project decision | Consistency with existing classification.service pattern |
| EventSource API | fetch + ReadableStream.getReader() | Modern browsers | Supports POST method (EventSource is GET-only) |
| OpenAI Assistants API | Chat Completions API | Assistants deprecated Aug 2026 | Use chat.completions.create with stream: true |
| Separate tokenizer for counting | stream_options: { include_usage: true } | OpenAI 2024 | Final chunk includes token usage |

**Deprecated/outdated:**
- OpenAI Assistants API: Shutting down August 2026. Use Chat Completions API.
- `zodResponseFormat` with Zod v4: Incompatible. Use `z.toJSONSchema()` instead (already established in codebase).

## Recommendations (Claude's Discretion Areas)

### SSE Implementation: Use Standard Route Handler (NOT Edge)
**Recommendation:** Standard App Router route handler (`app/api/admin/chat/route.ts`)
**Rationale:** Edge runtime has limitations with Prisma (no native Node.js), and the route needs Prisma for context building and history persistence. Standard Node.js runtime is fine for streaming.

### Context Window Management
**Recommendation:** Tiered context strategy
1. **Always include:** Customer profile (name, notes, preferences, visit count) -- ~200 tokens
2. **Always include:** Last 5 karute aiSummary fields -- ~500 tokens
3. **Include if fits:** Full karute entries for last 3 records -- ~1000 tokens
4. **Include if fits:** Booking history (last 10) -- ~300 tokens
5. **Budget:** Reserve ~4000 tokens for conversation history, ~2000 for response
6. **Total budget:** ~8000 tokens for context, well within GPT-4o limits

### Citation Format
**Recommendation:** Instruct AI to output `[KR:uuid]` markers. Client-side parsing replaces with numbered superscript links `[1]` that link to `/admin/karute/{id}`. Store citation mapping in ChatMessage.citations JSON field.

### Chat Message Bubble Styling
**Recommendation:** Minimal, clean design:
- User messages: Right-aligned, primary color background, white text
- AI messages: Left-aligned, light gray background, dark text
- Citations: Superscript numbers as links, blue color
- Timestamps: Small, gray, below each message

### Quick Action Button Set
**Recommendation for customer-scoped mode:**
- "前回の施術まとめ" / "Summarize last visit"
- "施術履歴を表示" / "Show treatment history"
- "アレルギー情報" / "Any allergies?"
- "次回の予約" / "Next appointment"

**Recommendation for global mode:**
- "最近の施術傾向" / "Recent treatment trends"
- "本日の予約一覧" / "Today's appointments"

## Open Questions

1. **Token cost management**
   - What we know: GPT-4o pricing is known, stream_options gives usage
   - What's unclear: Should there be per-customer or per-day token limits?
   - Recommendation: Log token usage per conversation, add monitoring. Defer limits to a later phase.

2. **Global mode query scope**
   - What we know: Global mode queries across all customers
   - What's unclear: How many customers/records to include in global context? All records could be massive.
   - Recommendation: For global mode, use recent karute records (last 30 days, max 50 records) as context. This is a reasonable default.

3. **Conversation boundaries**
   - What we know: Chat history saved per customer
   - What's unclear: When does a new conversation start? Auto-create new after time gap? Explicit "new chat" button?
   - Recommendation: Show most recent conversation by default. Add "New Chat" button. Auto-create new conversation if last message was >24 hours ago.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/services/classification.service.ts` -- OpenAI streaming pattern, lazy client, Zod v4 workaround
- Existing codebase: `prisma/schema.prisma` -- All current models, Customer/KaruteRecord relations
- Existing codebase: `package.json` -- All dependency versions confirmed
- Existing codebase: `app/api/admin/karute/[id]/classify/route.ts` -- Auth guard pattern
- Existing codebase: `app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx` -- SWR/i18n patterns

### Secondary (MEDIUM confidence)
- [OpenAI Streaming Guide](https://developers.openai.com/api/docs/guides/streaming-responses/) -- SSE streaming patterns
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) -- Stream iteration, SDK version
- [OpenAI Community - stream_options usage](https://community.openai.com/t/usage-stats-now-available-when-using-streaming-with-the-chat-completions-api-or-completions-api/738156) -- include_usage for token tracking

### Tertiary (LOW confidence)
- [Vercel AI SDK vs OpenAI SDK comparison](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison-guide) -- Decision to stick with raw SDK validated
- [Next.js SSE Discussion](https://github.com/vercel/next.js/discussions/48427) -- SSE in App Router route handlers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed and used in codebase
- Architecture: HIGH -- Follows established patterns from classification and karute services
- Pitfalls: HIGH -- Context window and streaming issues are well-documented
- Citation system: MEDIUM -- Citation parsing is custom, needs validation during implementation
- Global mode: MEDIUM -- Scope and performance of cross-customer queries needs runtime validation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- stable domain, no fast-moving dependencies)
