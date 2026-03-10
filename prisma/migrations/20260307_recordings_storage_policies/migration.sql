-- Storage RLS policies for audio recording uploads.
-- All operations (upload, download, delete) are server-side using SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS entirely. No client-side access policies are needed.
-- Audio is served via signed URLs generated server-side (no authenticated policy required).
-- This bucket is admin-only: no customer self-service access.

-- No client-side storage policies are defined for the recordings bucket.
-- If client-side access is required in future, restrict to current_setting('app.role') = 'admin'.
