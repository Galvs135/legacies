create table if not exists public.action_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position int not null check (position > 0),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.cases
  add column if not exists lead_name text,
  add column if not exists action_value numeric(12,2),
  add column if not exists action_type_id uuid references public.action_types(id),
  add column if not exists opened_at timestamptz default now();

update public.cases
set lead_name = coalesce(lead_name, title),
    action_value = coalesce(action_value, estimated_value, 0),
    opened_at = coalesce(opened_at, created_at, now())
where lead_name is null
   or action_value is null
   or opened_at is null;

alter table public.cases
  alter column lead_name set not null,
  alter column action_value set not null,
  alter column opened_at set not null;

create index if not exists idx_action_types_name on public.action_types (name);
create index if not exists idx_pipeline_stages_position on public.pipeline_stages (position);
create index if not exists idx_cases_action_type_id on public.cases (action_type_id);

alter table public.action_types enable row level security;
alter table public.pipeline_stages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'action_types' and policyname = 'read_action_types'
  ) then
    create policy "read_action_types"
    on public.action_types for select
    using (auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pipeline_stages' and policyname = 'read_pipeline_stages'
  ) then
    create policy "read_pipeline_stages"
    on public.pipeline_stages for select
    using (auth.role() = 'authenticated');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'action_types' and policyname = 'admin_write_action_types'
  ) then
    create policy "admin_write_action_types"
    on public.action_types for all
    using (
      exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.role = 'admin'
      )
    )
    with check (
      exists (
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
    where schemaname = 'public' and tablename = 'pipeline_stages' and policyname = 'admin_write_pipeline_stages'
  ) then
    create policy "admin_write_pipeline_stages"
    on public.pipeline_stages for all
    using (
      exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.users u
        where u.id = auth.uid() and u.role = 'admin'
      )
    );
  end if;
end $$;

insert into public.action_types (name)
values ('Trabalhista'), ('Civel'), ('Consumidor')
on conflict (name) do nothing;

insert into public.pipeline_stages (name, position)
values
  ('prospeccao', 1),
  ('qualificacao', 2),
  ('proposta', 3),
  ('negociacao', 4),
  ('fechado', 5)
on conflict (name) do update set position = excluded.position;
