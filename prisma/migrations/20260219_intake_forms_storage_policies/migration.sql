-- Storage RLS policies for intake form uploads.
-- Required because server-side upload currently uses anon key when
-- SUPABASE_SERVICE_ROLE_KEY is not configured.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_insert'
  ) then
    create policy "intake_forms_insert"
      on storage.objects
      for insert
      to public
      with check (bucket_id = 'intake-forms');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_select'
  ) then
    create policy "intake_forms_select"
      on storage.objects
      for select
      to public
      using (bucket_id = 'intake-forms');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'intake_forms_delete'
  ) then
    create policy "intake_forms_delete"
      on storage.objects
      for delete
      to public
      using (bucket_id = 'intake-forms');
  end if;
end $$;
