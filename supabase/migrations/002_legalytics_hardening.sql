create extension if not exists pgcrypto;

create index if not exists idx_clients_owner_user_id on public.clients (owner_user_id);
create index if not exists idx_leads_owner_user_id on public.leads (owner_user_id);
create index if not exists idx_cases_owner_user_id on public.cases (owner_user_id);
create index if not exists idx_cases_pipeline_stage on public.cases (pipeline_stage);
create index if not exists idx_interactions_case_id on public.interactions (case_id);
create index if not exists idx_documents_case_id on public.documents (case_id);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'interactions'
      and policyname = 'owner_interactions_rw'
  ) then
    create policy "owner_interactions_rw"
    on public.interactions
    for all
    using (
      exists (
        select 1
        from public.cases c
        where c.id = interactions.case_id
          and c.owner_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.cases c
        where c.id = interactions.case_id
          and c.owner_user_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and policyname = 'owner_documents_rw'
  ) then
    create policy "owner_documents_rw"
    on public.documents
    for all
    using (
      exists (
        select 1
        from public.cases c
        where c.id = documents.case_id
          and c.owner_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.cases c
        where c.id = documents.case_id
          and c.owner_user_id = auth.uid()
      )
    );
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('legal-documents', 'legal-documents', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'legal_docs_owner_rw'
  ) then
    create policy "legal_docs_owner_rw"
    on storage.objects
    for all
    using (
      bucket_id = 'legal-documents'
      and owner = auth.uid()
    )
    with check (
      bucket_id = 'legal-documents'
      and owner = auth.uid()
    );
  end if;
end $$;
