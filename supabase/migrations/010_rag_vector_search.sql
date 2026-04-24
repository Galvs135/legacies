create extension if not exists vector;

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null check (source_type in ('case', 'lead', 'interaction', 'document')),
  source_id text not null,
  case_id uuid references public.cases(id) on delete set null,
  title text not null,
  content text not null,
  chunk_index int not null default 0 check (chunk_index >= 0),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, source_type, source_id, chunk_index)
);

create index if not exists idx_rag_chunks_owner_user_id on public.rag_chunks(owner_user_id);
create index if not exists idx_rag_chunks_case_id on public.rag_chunks(case_id);
create index if not exists idx_rag_chunks_source on public.rag_chunks(source_type, source_id);
create index if not exists idx_rag_chunks_metadata on public.rag_chunks using gin(metadata);
create index if not exists idx_rag_chunks_embedding
  on public.rag_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.rag_chunks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rag_chunks' and policyname = 'owner_or_admin_rag_chunks_rw'
  ) then
    create policy "owner_or_admin_rag_chunks_rw"
    on public.rag_chunks
    for all
    using (
      owner_user_id = auth.uid()
      or exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.role = 'admin'
      )
    )
    with check (
      owner_user_id = auth.uid()
      or exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.role = 'admin'
      )
    );
  end if;
end $$;

create or replace function public.match_rag_chunks(
  p_owner_user_id uuid,
  p_query_embedding vector(1536),
  p_top_k int default 6,
  p_case_id uuid default null,
  p_source_type text default null
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  case_id uuid,
  title text,
  content text,
  score double precision
)
language sql
stable
as $$
  select
    rc.id,
    rc.source_type,
    rc.source_id,
    rc.case_id,
    rc.title,
    rc.content,
    1 - (rc.embedding <=> p_query_embedding) as score
  from public.rag_chunks rc
  where rc.owner_user_id = p_owner_user_id
    and (p_case_id is null or rc.case_id = p_case_id)
    and (p_source_type is null or rc.source_type = p_source_type)
  order by rc.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_top_k, 6), 1), 20);
$$;

grant execute on function public.match_rag_chunks(uuid, vector, int, uuid, text) to authenticated, service_role;
