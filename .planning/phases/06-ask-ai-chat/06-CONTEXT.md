# Phase 6: Ask AI Chat - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Chat interface where staff can ask questions about customers and their karute history, with streaming AI responses powered by OpenAI. Supports customer-scoped and global query modes. Chat history persisted per customer and shared across staff.

</domain>

<decisions>
## Implementation Decisions

### Chat Interface Design
- Slide-over panel from the right side (like Intercom) — staff keeps current page visible
- Simple single-line text input with send button, Enter to send
- Quick action buttons for common queries: 'Summarize last visit', 'Show treatment history', 'Any allergies?'
- Language matches user's current locale (ja or en)

### Query Scope & Context
- Both customer-scoped and global modes — auto-context when viewing a customer, global for cross-customer queries
- AI has access to all karute records for the customer (no history limit)
- AI also has access to booking history and customer profile data (notes, preferences, visit count)

### Response Behavior
- Streaming responses via SSE — text appears word-by-word as AI generates it
- Inline citations referencing specific karute records — clickable links to the source record
- Japanese-first responses matching user locale

### Conversation Persistence
- Chat history saved per customer — staff sees previous questions when re-opening chat for same customer
- Shared across all staff — any staff member can see chat history for any customer
- Collaborative knowledge building

### Claude's Discretion
- Chat message bubble styling
- Quick action button set and wording
- SSE implementation details (API route vs edge function)
- Context window management for large karute histories
- Citation format and link behavior

</decisions>

<specifics>
## Specific Ideas

- Owner's prototype (liampwww/synq-karute) had an AI chat feature — this implements it properly with streaming and persistence
- Slide-over panel should be accessible from customer detail page and from karute record views
- Quick actions should be context-aware (different suggestions in customer-scoped vs global mode)

</specifics>

<deferred>
## Deferred Ideas

- Voice input for chat queries — future enhancement
- Chat export/sharing — not needed for MVP
- AI-initiated alerts (proactive suggestions) — separate feature

</deferred>

---

*Phase: 06-ask-ai-chat*
*Context gathered: 2026-03-07*
