-- Change RecordingSession.karuteRecord FK from SetNull to Cascade.
-- Recording sessions belong to karute records and should be cleaned up with them.
-- This aligns with karute.service.ts which cleans up session audio on record deletion.

ALTER TABLE "RecordingSession"
  DROP CONSTRAINT IF EXISTS "RecordingSession_karuteRecordId_fkey",
  ADD CONSTRAINT "RecordingSession_karuteRecordId_fkey"
    FOREIGN KEY ("karuteRecordId")
    REFERENCES "KaruteRecord"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
