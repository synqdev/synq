-- Remove client-side storage policies for the recordings bucket.
-- All recording access is server-side via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- Client-side bucket-wide policies are not needed and pose a security risk for medical data.

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_insert'
  ) then
    drop policy "recordings_insert" on storage.objects;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_select'
  ) then
    drop policy "recordings_select" on storage.objects;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_delete'
  ) then
    drop policy "recordings_delete" on storage.objects;
  end if;
end $$;
