-- Storage RLS policies for audio recording uploads.
-- Server-side operations use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- These policies control client-side access: authenticated users only.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_insert'
  ) then
    create policy "recordings_insert"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'recordings');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_select'
  ) then
    create policy "recordings_select"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'recordings');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_delete'
  ) then
    create policy "recordings_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'recordings' and auth.uid() is not null);
  end if;
end $$;
