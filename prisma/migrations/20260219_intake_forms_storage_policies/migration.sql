-- Storage RLS policies for intake form uploads.
-- Server-side operations use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- These policies control client-side access: authenticated users only.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_insert'
  ) then
    create policy "intake_forms_insert"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'intake-forms');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_select'
  ) then
    create policy "intake_forms_select"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'intake-forms');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_delete'
  ) then
    create policy "intake_forms_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'intake-forms' and auth.uid() is not null);
  end if;
end $$;
