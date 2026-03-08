# Phase 3: Karte Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema, storage configuration, and service/API layer for the karute (electronic medical records) system. This is the data backbone — no UI, no AI, no recording. Just models, services, validation, and CRUD operations that all subsequent Karte phases (4-7) build on.

Reference implementation: [liampwww/synq-karute](https://github.com/liampwww/synq-karute)

</domain>

<decisions>
## Implementation Decisions

### Schema Integration
- Keep Prisma for all karute models (consistent with entire codebase, no Supabase client SDK)
- Single-shop — no org_id on karute tables (matches existing schema; multi-tenant is a future dedicated phase)
- Use existing Worker model as practitioner on karute records (no separate Staff model)
- Optional link to Booking — `bookingId` is nullable on KaruteRecord and RecordingSession (supports walk-ins, phone consultations, retroactive notes)
- Keep existing MedicalRecord/MedicalRecordItem models for intake forms — karute is a separate system for per-visit AI-generated treatment notes
- Four new Prisma models: KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment

### Karute Entry Categories
- Wellness-focused category set (Prisma enum): SYMPTOM, TREATMENT, BODY_AREA, PREFERENCE, LIFESTYLE, NEXT_VISIT, OTHER
- Prisma enum (not string field) — type-safe, validated at DB level
- Hardcode business type as "wellness" for MVP — no business_type field on karute records
- Categories can be expanded via migration later

### Audio Storage
- Supabase Storage private bucket named `recordings`
- 100MB file size limit (compressed audio ~6-10MB/hour, plenty of headroom)
- Allowed MIME types: audio/webm, audio/mp4, audio/wav, audio/ogg
- Storage path: `recordings/{recordingId}.webm` (flat structure, single-shop)
- Admin-only delete capability — no compliance retention rules for MVP
- No automatic cleanup or retention policies for MVP

### API Layer Design
- Server actions for karute CRUD mutations (consistent with booking/schedule patterns)
- API routes only where needed: streaming (Ask AI), file upload (audio), external AI calls (Whisper, classification)
- Service layer with Result<T> discriminated union pattern (matches booking-service.ts)
- Full CRUD in Phase 3: create, read, update, delete for karute records and entries
- Zod validation schemas included in foundation (validate from day one)

### Claude's Discretion
- Exact Prisma model field names and index strategy
- RLS policy implementation details
- Test coverage approach for service layer
- Migration naming conventions

</decisions>

<specifics>
## Specific Ideas

- Owner's repo (liampwww/synq-karute) serves as reference for schema design, but adapted for our Prisma-based architecture
- KaruteRecord has approval workflow states: draft -> review -> approved (stored as Prisma enum)
- KaruteEntry includes confidence score (float) and original_quote from transcript
- RecordingSession tracks: status (recording/paused/completed/processing/failed), duration_seconds, audio_storage_path
- TranscriptionSegment stores: segment_index, speaker_label, content, start_ms, end_ms, language

</specifics>

<deferred>
## Deferred Ideas

- Multi-tenant/org_id scoping — future dedicated phase across all models
- Configurable business types (hair, nail, wellness) — hardcoded wellness for now
- Configurable karute categories per business — fixed enum for now
- Compliance retention policies — not needed for wellness MVP
- Storage path org-scoping (`{orgId}/recordings/...`) — add with multi-tenant phase

</deferred>

---

*Phase: 03-karte-foundation*
*Context gathered: 2026-03-07*
