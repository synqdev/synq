-- Add updatedAt field to KaruteEntry for audit trail.
-- Add workerId index to RecordingSession for worker-based queries.

ALTER TABLE "KaruteEntry" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "RecordingSession_workerId_idx" ON "RecordingSession"("workerId");
