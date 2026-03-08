-- SYNQ Karute Row Level Security (RLS) Policies
-- Karute data is admin-only (practitioners use admin panel).
-- No customer self-service access to karute records.
--
-- IMPORTANT: All API routes and server actions that query these tables MUST call
-- withRLSContext({ role: 'admin' }, ...) from src/lib/db/rls-context.ts before
-- executing Prisma queries, otherwise the current_setting('app.role') check will
-- fail and the query will be denied.

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL KARUTE TABLES
-- ============================================================================

ALTER TABLE "KaruteRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KaruteEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecordingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranscriptionSegment" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- KARUTE RECORD POLICIES
-- ============================================================================

CREATE POLICY "Admin can manage karute records"
  ON "KaruteRecord" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- KARUTE ENTRY POLICIES
-- ============================================================================

CREATE POLICY "Admin can manage karute entries"
  ON "KaruteEntry" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- RECORDING SESSION POLICIES
-- ============================================================================

CREATE POLICY "Admin can manage recording sessions"
  ON "RecordingSession" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- TRANSCRIPTION SEGMENT POLICIES
-- ============================================================================

CREATE POLICY "Admin can manage transcription segments"
  ON "TranscriptionSegment" FOR ALL
  USING (current_setting('app.role', true) = 'admin');
