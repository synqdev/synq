# Phase 5: AI Classification & Karute UI - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

AI classifies transcription segments (from Phase 4) into structured karute entries with categories and confidence scores, generates a session summary, and provides a full editing UI with approval workflow. Staff can view, edit, add, and delete entries, approve records, view per-customer karute history, and export records as formatted text/PDF.

</domain>

<decisions>
## Implementation Decisions

### AI Classification Behavior
- Fully automatic classification — AI processes entire transcript at once, generates all entries. Staff reviews/edits after.
- Low-confidence entries flagged visually with a warning badge. Staff decides the correct category.
- AI auto-generates a brief narrative summary for each karute record alongside structured entries.
- Tags are optional extra metadata staff can add to entries (e.g., 'chronic', 'first-time', 'follow-up') — separate from the fixed category enum (SYMPTOM, TREATMENT, etc.)

### Karute Entry Editing UI
- Card-based list — each entry is a card with category badge, content, confidence score
- Inline editing — click entry text to edit in-place, category changeable via dropdown
- Staff can manually add new entries the AI missed (pick category, type content, optionally link to transcript)
- Side-by-side layout — transcript on one side, entries on the other. Click entry to highlight source in transcript.

### Approval Workflow UX
- Three-step workflow: Draft → Review → Approved
- Any logged-in admin/staff can approve (no role restriction)
- Approved records remain always editable (approval is a status marker, not a lock)
- Color-coded status badges: Draft=gray, Review=yellow, Approved=green

### Karute History & Export
- Per-customer karute history displayed as chronological timeline (most recent first)
- Each record in list shows: date, practitioner, status badge (minimal — click to see details)
- Export as formatted text/PDF — clean document with summary, entries by category, practitioner info
- History accessible as a tab in the existing customer detail page (CRM integration)

### Claude's Discretion
- Exact card component styling and spacing
- AI prompt engineering for classification and summary generation
- PDF generation approach (server-side vs client-side)
- Loading states and skeleton UI
- Transcript highlight interaction details

</decisions>

<specifics>
## Specific Ideas

- Owner's prototype (liampwww/synq-karute) had a tags concept — implemented here as optional metadata on entries, not replacing categories
- Entry cards should show the original transcript quote (original_quote field from KaruteEntry) so staff can see what the AI based the classification on
- Side-by-side transcript view should make it easy to verify AI accuracy — clicking an entry scrolls/highlights the relevant transcript segment

</specifics>

<deferred>
## Deferred Ideas

- Version history for karute records (edit creates new version) — could be added later for audit trails
- Role-based approval restrictions (only certain staff can approve) — not needed for single-shop MVP
- CSV export for data analysis — PDF is enough for now, CSV can be added later

</deferred>

---

*Phase: 05-ai-classification-karute-ui*
*Context gathered: 2026-03-07*
