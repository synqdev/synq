# Phase 3: Karte Foundation - Research

**Researched:** 2026-03-07
**Domain:** Prisma schema design, Supabase Storage, service layer patterns
**Confidence:** HIGH

## Summary

Phase 3 adds four new Prisma models (KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment), configures a Supabase Storage bucket for audio recordings, and builds a service/API layer following the established codebase patterns. The codebase already has strong conventions: Result<T> discriminated unions in services, Zod validation schemas, server actions for mutations, and API routes for file uploads. The reference repo (liampwww/synq-karute) uses raw SQL with Supabase client SDK and multi-tenant org_id scoping — we adapt only the schema design while stripping multi-tenant concerns and using Prisma instead.

Key findings: (1) The project uses `prisma db push` for schema changes plus manual SQL migration files for RLS/storage policies — this is the pattern to follow. (2) Supabase Storage operations already have a working pattern in `supabase-storage.ts` (singleton client, upload/signedUrl/delete). (3) The project runs Zod v4 and Prisma v6 — both relatively recent, with stable APIs matching existing code. (4) RLS policies follow a simple `current_setting('app.role', true) = 'admin'` pattern since karute data is admin-only.

**Primary recommendation:** Follow existing codebase patterns exactly. Build karute-service.ts and recording-storage.ts mirroring booking.service.ts and supabase-storage.ts respectively. Use `prisma db push` + manual SQL migration for RLS.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Keep Prisma for all karute models (consistent with entire codebase, no Supabase client SDK)
- Single-shop — no org_id on karute tables (matches existing schema; multi-tenant is a future dedicated phase)
- Use existing Worker model as practitioner on karute records (no separate Staff model)
- Optional link to Booking — `bookingId` is nullable on KaruteRecord and RecordingSession (supports walk-ins, phone consultations, retroactive notes)
- Keep existing MedicalRecord/MedicalRecordItem models for intake forms — karute is a separate system for per-visit AI-generated treatment notes
- Four new Prisma models: KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment
- Wellness-focused category set (Prisma enum): SYMPTOM, TREATMENT, BODY_AREA, PREFERENCE, LIFESTYLE, NEXT_VISIT, OTHER
- Prisma enum (not string field) — type-safe, validated at DB level
- Hardcode business type as "wellness" for MVP — no business_type field on karute records
- Categories can be expanded via migration later
- Supabase Storage private bucket named `recordings`
- 100MB file size limit (compressed audio ~6-10MB/hour, plenty of headroom)
- Allowed MIME types: audio/webm, audio/mp4, audio/wav, audio/ogg
- Storage path: `recordings/{recordingId}.webm` (flat structure, single-shop)
- Admin-only delete capability — no compliance retention rules for MVP
- No automatic cleanup or retention policies for MVP
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

### Deferred Ideas (OUT OF SCOPE)
- Multi-tenant/org_id scoping — future dedicated phase across all models
- Configurable business types (hair, nail, wellness) — hardcoded wellness for now
- Configurable karute categories per business — fixed enum for now
- Compliance retention policies — not needed for wellness MVP
- Storage path org-scoping (`{orgId}/recordings/...`) — add with multi-tenant phase
</user_constraints>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | ^6.19.2 | ORM for all karute models | Consistent with entire codebase |
| prisma | ^6.19.2 | Schema/migration tooling | Already the schema management approach |
| @supabase/supabase-js | ^2.97.0 | Storage bucket operations (audio uploads) | Already used for intake-forms bucket |
| zod | ^4.3.6 | Validation schemas for karute inputs | Already used for all validation in codebase |
| @sentry/nextjs | ^10.38.0 | Error tracking in service layer | Already integrated in booking.service.ts |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next | ^15.5.12 | Server actions, API routes | Mutation handlers, file upload endpoint |
| jose | (installed) | JWT verification | Admin auth check in actions/routes |
| swr | ^2.4.0 | Client data fetching | Future UI phases will use this for karute data |

### No New Dependencies Needed
This phase introduces zero new npm packages. Everything builds on the existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── services/
│   ├── karute.service.ts          # KaruteRecord + KaruteEntry CRUD
│   └── recording.service.ts       # RecordingSession + TranscriptionSegment CRUD
├── storage/
│   ├── supabase-storage.ts        # (existing) intake-forms bucket
│   └── recording-storage.ts       # recordings bucket (upload/signedUrl/delete)
├── validations/
│   └── karute.ts                  # Zod schemas for karute inputs
├── db/
│   └── client.ts                  # (existing) Prisma singleton
app/
├── actions/
│   └── karute.ts                  # Server actions for karute mutations
├── api/
│   └── admin/
│       └── karute/
│           ├── route.ts           # List/create karute records
│           └── [id]/
│               ├── route.ts       # Get/update/delete karute record
│               └── entries/
│                   └── route.ts   # CRUD for entries on a record
│       └── recordings/
│           └── upload/
│               └── route.ts       # Audio file upload endpoint
prisma/
├── schema.prisma                  # Add new models + enums
├── migrations/
│   ├── 20260204_rls_policies/     # (existing)
│   ├── 20260219_intake_forms_storage_policies/  # (existing)
│   ├── YYYYMMDD_karute_rls_policies/            # New RLS for karute tables
│   └── YYYYMMDD_recordings_storage_policies/    # New storage bucket + policies
```

### Pattern 1: Result<T> Discriminated Union (Established)
**What:** Every service function returns `{ success: true; data: T } | { success: false; error: string }`
**When to use:** All service-layer functions
**Example:**
```typescript
// Source: booking.service.ts pattern (adapted for karute)
export type KaruteResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createKaruteRecord(
  input: CreateKaruteRecordInput
): Promise<KaruteResult<KaruteRecordWithEntries>> {
  const parseResult = createKaruteRecordSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((i) => i.message).join(', '),
    };
  }

  try {
    const record = await prisma.karuteRecord.create({
      data: { ... },
      include: { entries: true, customer: true, worker: true },
    });
    return { success: true, data: record };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Pattern 2: Server Action with Admin Auth (Established)
**What:** `'use server'` functions that verify admin session, call service, revalidate paths
**When to use:** All mutation operations from admin UI
**Example:**
```typescript
// Source: admin-booking.ts pattern
'use server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth/admin'
import { createKaruteRecord } from '@/lib/services/karute.service'

export async function createKaruteRecordAction(input: CreateKaruteRecordInput) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const result = await createKaruteRecord(input)
  if (!result.success) throw new Error(result.error)

  revalidatePath('/admin/dashboard')
  return { success: true, id: result.data.id }
}
```

### Pattern 3: Supabase Storage Module (Established)
**What:** Dedicated module per bucket with singleton client, upload/signedUrl/delete functions
**When to use:** Audio file operations for recording sessions
**Example:**
```typescript
// Source: supabase-storage.ts pattern (adapted for recordings)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
function getSupabase() { /* same singleton pattern */ }

const BUCKET = 'recordings'

export async function uploadRecording(
  recordingId: string,
  file: File
): Promise<{ path: string }> {
  const path = `${recordingId}.webm`
  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return { path: data.path }
}

export async function getRecordingSignedUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase().storage
    .from(BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry
  if (error) throw new Error(`Failed to get URL: ${error.message}`)
  return data.signedUrl
}

export async function deleteRecording(path: string): Promise<void> {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
```

### Pattern 4: API Route for File Upload (Established)
**What:** NextRequest handler with formData parsing, MIME/size validation, admin auth
**When to use:** Audio upload endpoint (server actions cannot handle large file uploads well)
**Example:**
```typescript
// Source: app/api/admin/customers/[id]/intake/route.ts pattern
const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Too large' }, { status: 400 })

  // Upload to storage, create/update DB record
}
```

### Pattern 5: Manual SQL Migration for RLS (Established)
**What:** SQL files in `prisma/migrations/YYYYMMDD_description/migration.sql` for RLS policies
**When to use:** New tables that need row-level security
**Key detail:** These are NOT standard `prisma migrate` migrations. They are applied manually or via deployment scripts. The project uses `prisma db push` for schema sync.
**Example:**
```sql
-- Source: 20260204_rls_policies/migration.sql pattern
ALTER TABLE "KaruteRecord" ENABLE ROW LEVEL SECURITY;

-- Karute data is admin-only (no customer self-service)
CREATE POLICY "Admin can manage karute records"
  ON "KaruteRecord" FOR ALL
  USING (current_setting('app.role', true) = 'admin');
```

### Anti-Patterns to Avoid
- **Supabase client SDK for data queries:** The codebase uses Prisma exclusively for DB operations. Supabase client is ONLY for Storage.
- **Multi-tenant org_id fields:** Single-shop architecture. Do not add org_id to any karute tables.
- **Shared Result type:** Each service defines its own Result type variant (BookingResult, KaruteResult). Do not create a shared generic.
- **Standard Prisma migrations:** The project uses `prisma db push`, not `prisma migrate dev`. RLS/storage policies are manual SQL files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload validation | Custom MIME detection, size checking | Supabase Storage upload with server-side validation | Supabase handles storage, we validate before upload |
| Signed URL generation | Custom token/expiry system | `supabase.storage.createSignedUrl()` | Handles expiry, path validation, auth automatically |
| UUID generation | Custom ID generators | Prisma `@default(uuid())` | Database-level, guaranteed unique |
| Enum validation | String checking logic | Prisma enum types + Zod enum schemas | Type-safe at DB level AND validation level |
| Input sanitization | Custom sanitizers | Zod schemas with `.safeParse()` | Consistent with entire codebase |
| Admin auth middleware | Custom middleware | `getAdminSession()` from existing auth module | Already handles JWT verification |

**Key insight:** The codebase has mature patterns for every infrastructure concern. The karute service layer is structurally identical to booking/customer services — same shape, different domain.

## Common Pitfalls

### Pitfall 1: Prisma Enum Naming Collisions
**What goes wrong:** Prisma enums are global to the schema. Names like `Status` collide if multiple models use status enums.
**Why it happens:** The Booking model uses a string for status, but karute uses Prisma enums.
**How to avoid:** Use descriptive enum names scoped to the domain: `KaruteStatus`, `RecordingStatus`, `KaruteEntryCategory`.
**Warning signs:** Prisma generate errors about duplicate enum names.

### Pitfall 2: Forgetting to Enable RLS on New Tables
**What goes wrong:** New karute tables are accessible without auth if RLS is not enabled.
**Why it happens:** `prisma db push` creates tables without RLS. The RLS must be applied separately via manual SQL.
**How to avoid:** Create a migration SQL file for RLS immediately after pushing schema. Test that unauthenticated queries are blocked.
**Warning signs:** Data accessible from Supabase client without service role key.

### Pitfall 3: Storage Bucket Not Created Before Code Deploys
**What goes wrong:** Upload functions fail because the `recordings` bucket doesn't exist in Supabase.
**Why it happens:** Storage buckets are created via Supabase Dashboard or CLI, not via Prisma or code.
**How to avoid:** Document bucket creation as a deployment prerequisite. Include setup script or dashboard instructions.
**Warning signs:** "Bucket not found" errors in Sentry.

### Pitfall 4: Cascade Delete Chain
**What goes wrong:** Deleting a Customer cascades to KaruteRecords, which cascades to KaruteEntries, but audio files in Storage are orphaned.
**Why it happens:** Prisma cascade only handles DB records. Storage files are separate.
**How to avoid:** Service-layer delete functions must clean up storage before or after DB deletion (best-effort, log failures). See existing pattern in `medical-record.service.ts` where `deleteIntakeForm` is called alongside DB delete.
**Warning signs:** Growing storage usage with no corresponding DB records.

### Pitfall 5: Large Audio File Upload Timeouts
**What goes wrong:** Next.js API routes have default body size limits and timeouts that reject large audio files.
**Why it happens:** Next.js 15 has a default 1MB body parser limit for API routes.
**How to avoid:** Configure `export const config = { api: { bodyParser: { sizeLimit: '100mb' } } }` or use the App Router equivalent. For App Router, the body parser limit is configured differently — use `export const maxDuration` and adjust `next.config.ts` if needed.
**Warning signs:** 413 (Payload Too Large) errors on upload.

### Pitfall 6: Prisma db push in Production
**What goes wrong:** `prisma db push` can be destructive in production — it may drop columns/tables.
**Why it happens:** `db push` synchronizes schema by diffing, which may involve dropping data.
**How to avoid:** For production, generate proper migrations with `prisma migrate dev` or use `prisma migrate deploy`. For this phase (development), `db push` is fine.
**Warning signs:** Data loss after schema changes.

### Pitfall 7: Zod v4 API Differences
**What goes wrong:** Using Zod v3 patterns that behave differently in v4.
**Why it happens:** The project uses Zod ^4.3.6. Some APIs changed between v3 and v4.
**How to avoid:** Follow the existing validation file patterns exactly (e.g., `src/lib/validations/booking.ts`). The existing code already uses v4-compatible patterns.
**Warning signs:** TypeScript errors on Zod schemas, runtime validation failures.

## Code Examples

### Prisma Schema: Karute Models

```prisma
// Source: Adapted from reference repo schema + CONTEXT.md decisions

// New enums
enum KaruteStatus {
  DRAFT
  REVIEW
  APPROVED
}

enum RecordingStatus {
  RECORDING
  PAUSED
  COMPLETED
  PROCESSING
  FAILED
}

enum KaruteEntryCategory {
  SYMPTOM
  TREATMENT
  BODY_AREA
  PREFERENCE
  LIFESTYLE
  NEXT_VISIT
  OTHER
}

// New models
model KaruteRecord {
  id          String        @id @default(uuid())
  customerId  String
  customer    Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)
  workerId    String
  worker      Worker        @relation(fields: [workerId], references: [id], onDelete: Restrict)
  bookingId   String?
  booking     Booking?      @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  aiSummary   String?
  status      KaruteStatus  @default(DRAFT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  entries           KaruteEntry[]
  recordingSessions RecordingSession[]

  @@index([customerId])
  @@index([workerId])
  @@index([bookingId])
  @@index([status])
  @@index([createdAt])
}

model KaruteEntry {
  id            String               @id @default(uuid())
  karuteId      String
  karute        KaruteRecord         @relation(fields: [karuteId], references: [id], onDelete: Cascade)
  category      KaruteEntryCategory
  content       String
  originalQuote String?
  confidence    Float                @default(0.0)
  createdAt     DateTime             @default(now())

  @@index([karuteId])
  @@index([category])
}

model RecordingSession {
  id               String          @id @default(uuid())
  karuteRecordId   String?
  karuteRecord     KaruteRecord?   @relation(fields: [karuteRecordId], references: [id], onDelete: SetNull)
  workerId         String
  worker           Worker          @relation(fields: [workerId], references: [id], onDelete: Restrict)
  customerId       String
  customer         Customer        @relation(fields: [customerId], references: [id], onDelete: Cascade)
  bookingId        String?
  booking          Booking?        @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  audioStoragePath String?
  durationSeconds  Int?
  status           RecordingStatus @default(RECORDING)
  startedAt        DateTime        @default(now())
  endedAt          DateTime?
  createdAt        DateTime        @default(now())

  segments TranscriptionSegment[]

  @@index([customerId])
  @@index([karuteRecordId])
  @@index([status])
}

model TranscriptionSegment {
  id           String           @id @default(uuid())
  recordingId  String
  recording    RecordingSession @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  segmentIndex Int
  speakerLabel String?
  content      String
  startMs      Int
  endMs        Int
  language     String           @default("ja")
  createdAt    DateTime         @default(now())

  @@index([recordingId])
  @@index([recordingId, segmentIndex])
}
```

**Note:** The existing Customer, Worker, and Booking models need relation fields added:
- Customer: `karuteRecords KaruteRecord[]`, `recordingSessions RecordingSession[]`
- Worker: `karuteRecords KaruteRecord[]`, `recordingSessions RecordingSession[]`
- Booking: `karuteRecords KaruteRecord[]`, `recordingSessions RecordingSession[]`

### Zod Validation: Karute Schemas

```typescript
// Source: Adapted from existing validation patterns (booking.ts, customer.ts)
import { z } from 'zod'

export const createKaruteRecordSchema = z.object({
  customerId: z.string().min(1, { message: 'Customer ID is required' }),
  workerId: z.string().min(1, { message: 'Worker ID is required' }),
  bookingId: z.string().min(1).optional(),
})

export type CreateKaruteRecordInput = z.infer<typeof createKaruteRecordSchema>

export const updateKaruteRecordSchema = z.object({
  id: z.string().min(1, { message: 'Record ID is required' }),
  aiSummary: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED']).optional(),
})

export type UpdateKaruteRecordInput = z.infer<typeof updateKaruteRecordSchema>

export const createKaruteEntrySchema = z.object({
  karuteId: z.string().min(1, { message: 'Karute ID is required' }),
  category: z.enum([
    'SYMPTOM', 'TREATMENT', 'BODY_AREA',
    'PREFERENCE', 'LIFESTYLE', 'NEXT_VISIT', 'OTHER',
  ]),
  content: z.string().min(1, { message: 'Content is required' }),
  originalQuote: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0),
})

export type CreateKaruteEntryInput = z.infer<typeof createKaruteEntrySchema>
```

### RLS Policy: Karute Tables (Admin-Only)

```sql
-- Source: Adapted from 20260204_rls_policies/migration.sql pattern
-- Karute data is admin-only (practitioners use admin panel)

ALTER TABLE "KaruteRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KaruteEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecordingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranscriptionSegment" ENABLE ROW LEVEL SECURITY;

-- KaruteRecord: admin-only access
CREATE POLICY "Admin can manage karute records"
  ON "KaruteRecord" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- KaruteEntry: admin-only access
CREATE POLICY "Admin can manage karute entries"
  ON "KaruteEntry" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- RecordingSession: admin-only access
CREATE POLICY "Admin can manage recording sessions"
  ON "RecordingSession" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- TranscriptionSegment: admin-only access
CREATE POLICY "Admin can manage transcription segments"
  ON "TranscriptionSegment" FOR ALL
  USING (current_setting('app.role', true) = 'admin');
```

### Storage Policy: Recordings Bucket

```sql
-- Source: Adapted from 20260219_intake_forms_storage_policies/migration.sql
-- Server-side operations use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_insert'
  ) then
    create policy "recordings_insert"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'recordings');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_select'
  ) then
    create policy "recordings_select"
      on storage.objects for select to authenticated
      using (bucket_id = 'recordings');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_delete'
  ) then
    create policy "recordings_delete"
      on storage.objects for delete to authenticated
      using (bucket_id = 'recordings' and auth.uid() is not null);
  end if;
end $$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma v5 `$transaction` | Prisma v6 `$transaction` (same API) | Prisma 6.x | No breaking changes for transactions |
| Zod v3 `.safeParse()` | Zod v4 `.safeParse()` (same API) | Zod 4.x | Error format slightly changed, but `.issues` array works same |
| `prisma migrate dev` | `prisma db push` + manual SQL | Project convention | Schema sync without migration history; RLS via manual files |
| Supabase Storage v1 | Supabase Storage v2 (`@supabase/supabase-js` ^2.x) | 2024 | Existing code already uses v2 API |

**Note on reference repo vs our approach:**
- Reference repo uses raw SQL tables, Supabase Auth, org_id scoping, Supabase client for everything
- We use Prisma models, JWT admin auth, single-shop (no org_id), Supabase only for Storage
- Schema structure (tables, relationships, fields) is adapted; infrastructure approach is entirely different

## Open Questions

1. **Next.js App Router body size limit for audio uploads**
   - What we know: App Router handles body parsing differently than Pages Router. The `export const config` pattern is Pages-only.
   - What's unclear: Exact configuration for 100MB uploads in App Router with Next.js 15. May need `next.config.ts` adjustment.
   - Recommendation: Test with a large file early. If 413 errors occur, add `experimental.serverActions.bodySizeLimit` or adjust `next.config.ts`. For API routes (not server actions), the App Router typically streams the body so large files should work with `request.formData()`.

2. **Test approach for service layer**
   - What we know: The codebase has no existing tests (no `*.test.ts` files found in `src/`). Jest is installed.
   - What's unclear: Whether to add tests in this phase or defer.
   - Recommendation: Include basic unit tests for the service layer in this phase. The karute service is new code with business logic (status transitions, cascade cleanup). Test the Result<T> paths at minimum. Use Prisma client mocking or a test database.

3. **Supabase Storage bucket creation**
   - What we know: Buckets are created via Dashboard or Supabase CLI, not via SQL or Prisma.
   - What's unclear: Whether the deployment process has automation for bucket creation.
   - Recommendation: Document manual bucket creation steps. Include a setup script similar to the reference repo's `scripts/setup-db.mjs` if feasible.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** — All patterns verified by reading actual source files:
  - `src/lib/services/booking.service.ts` — Result<T> pattern, error handling, Sentry
  - `src/lib/services/customer.service.ts` — CRUD service pattern
  - `src/lib/services/medical-record.service.ts` — Storage integration pattern
  - `src/lib/storage/supabase-storage.ts` — Supabase Storage singleton pattern
  - `src/lib/validations/booking.ts` — Zod validation pattern
  - `app/actions/admin-booking.ts` — Server action pattern
  - `app/api/admin/customers/[id]/intake/route.ts` — File upload API route pattern
  - `prisma/schema.prisma` — Existing model conventions
  - `prisma/migrations/20260204_rls_policies/migration.sql` — RLS policy pattern
  - `prisma/migrations/20260219_intake_forms_storage_policies/migration.sql` — Storage policy pattern
  - `src/lib/auth/admin.ts` — Admin auth pattern
  - `src/lib/db/client.ts` — Prisma singleton pattern

### Secondary (HIGH confidence)
- **liampwww/synq-karute** reference repo — Schema design reference:
  - `supabase/migrations/001_initial_schema.sql` — Table structure, relationships, indexes, RLS
  - `supabase/seed.sql` — Sample data structure

### Tertiary (MEDIUM confidence)
- Package versions from `package.json` — Zod v4, Prisma v6 confirmed from installed dependencies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already in use, versions verified from package.json
- Architecture: HIGH — All patterns verified from existing source code, no speculation
- Pitfalls: HIGH — Based on observed codebase patterns (e.g., manual RLS, Storage bucket setup) and known Prisma/Supabase behaviors
- Schema design: HIGH — Reference repo schema studied, CONTEXT.md decisions are specific

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable — no fast-moving dependencies, all patterns are established in codebase)
