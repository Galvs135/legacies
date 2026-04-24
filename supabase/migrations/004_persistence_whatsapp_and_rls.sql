alter table public.cases
  alter column client_id drop not null;

alter table public.leads
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists notes text;

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  owner_user_id uuid not null references public.users(id),
  client_name text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  from_role text not null check (from_role in ('cliente', 'advogado')),
  content text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_conversations_case_id on public.whatsapp_conversations(case_id);
create index if not exists idx_whatsapp_conversations_owner_user_id on public.whatsapp_conversations(owner_user_id);
create index if not exists idx_whatsapp_messages_conversation_id on public.whatsapp_messages(conversation_id);
create index if not exists idx_whatsapp_messages_sent_at on public.whatsapp_messages(sent_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_conversations' and policyname = 'owner_or_admin_whatsapp_conversations_rw'
  ) then
    create policy "owner_or_admin_whatsapp_conversations_rw"
    on public.whatsapp_conversations for all
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_messages' and policyname = 'owner_or_admin_whatsapp_messages_rw'
  ) then
    create policy "owner_or_admin_whatsapp_messages_rw"
    on public.whatsapp_messages for all
    using (
      exists (
        select 1
        from public.whatsapp_conversations wc
        where wc.id = whatsapp_messages.conversation_id
          and (
            wc.owner_user_id = auth.uid()
            or exists (
              select 1 from public.users u
              where u.id = auth.uid() and u.role = 'admin'
            )
          )
      )
    )
    with check (
      exists (
        select 1
        from public.whatsapp_conversations wc
        where wc.id = whatsapp_messages.conversation_id
          and (
            wc.owner_user_id = auth.uid()
            or exists (
              select 1 from public.users u
              where u.id = auth.uid() and u.role = 'admin'
            )
          )
      )
    );
  end if;
end $$;
